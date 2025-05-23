# Financial Events MCP Server
# Handles purchase events, updates analytics, and provides real-time dashboard updates
# Enhanced with Gamification and Client Insights integration

from fastapi import FastAPI, HTTPException, Body, Depends, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
import logging
import json
import asyncio
import os
import httpx
import time
from collections import defaultdict
import random  # For generating recommendation scores

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("financial_events_mcp")

# Create FastAPI app
app = FastAPI(
    title="Financial Events MCP",
    description="Processes financial events like purchases and generates real-time updates and analytics",
    version="1.0.0"
)

# CORS settings
origins = [
    "http://localhost",
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",
    "https://swanstudios-app.onrender.com"  # Production URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class PackageDetail(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    sessions: int = 0
    price: float = 0
    quantity: int = 1

class UserDemographics(BaseModel):
    joinDate: Optional[str] = None
    region: Optional[str] = 'unknown'

class PurchaseEvent(BaseModel):
    userId: str
    cartId: str
    userName: str
    email: str
    totalSessionsAdded: int = 0
    packages: List[str] = []
    totalAmount: float = 0
    timestamp: str
    # Enhanced metadata fields
    clientType: Optional[str] = 'standard'
    purchaseSource: Optional[str] = 'web'
    isFirstPurchase: Optional[bool] = False
    packageDetails: Optional[List[PackageDetail]] = []
    userDemographics: Optional[UserDemographics] = None
    # Optional orientation data for better insights
    orientationData: Optional[Dict[str, Any]] = None
    # Optional trainer assignment data
    assignedTrainerId: Optional[str] = None

class AdminDashboardUpdate(BaseModel):
    userId: str
    userName: str
    sessionsPurchased: int
    packageName: str
    amount: float
    timestamp: str
    clientType: Optional[str] = None
    isFirstPurchase: Optional[bool] = None
    region: Optional[str] = None
    
class TrainerRecommendation(BaseModel):
    trainerId: str
    trainerName: str
    matchScore: float  # 0-1 score indicating match quality
    reasons: List[str]  # Reasons for the recommendation
    specialties: List[str]  # Trainer specialties that match client needs
    availability: Optional[Dict[str, Any]] = None  # Availability summary
    
class ClientInsight(BaseModel):
    userId: str
    insights: List[Dict[str, Any]]
    motivationFactors: List[str]
    communicationStyle: str
    recommendedApproach: str
    fitnessPersona: Optional[str] = None
    predictedChurnRisk: Optional[float] = None
    
class ClientSessionRecommendation(BaseModel):
    userId: str
    recommendedSlots: List[Dict[str, Any]]  # List of recommended session slots
    recommendationRationale: str
    trainerAvailability: Optional[Dict[str, Any]] = None

# In-memory storage (for demo purposes)
# In production, use a database
recent_purchases = []
purchase_stats = {
    "total_revenue": 0.0,
    "total_sessions": 0,
    "client_count": set(),  # Using a set to count unique clients
    "package_counts": defaultdict(int),
    "hourly_revenue": defaultdict(float),
    "daily_revenue": defaultdict(float),
    # Enhanced analytics
    "purchase_sources": defaultdict(int),
    "client_types": defaultdict(int),
    "new_vs_returning": {"new": 0, "returning": 0},
    "region_breakdown": defaultdict(float),
    "average_package_value": 0.0,
    "popular_packages": [],  # Will store top packages by revenue
    "conversion_rate": {"count": 0, "total": 0},  # For tracking conversion rate
    "package_type_distribution": defaultdict(int)  # Distribution by package type
}

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {
            "admin": [],
            "trainer": [],
            "client": []
        }
    
    async def connect(self, websocket: WebSocket, client_type: str):
        if client_type not in self.active_connections:
            raise ValueError(f"Invalid client type: {client_type}")
        
        await websocket.accept()
        self.active_connections[client_type].append(websocket)
        logger.info(f"New {client_type} connection, total: {len(self.active_connections[client_type])}")
    
    def disconnect(self, websocket: WebSocket, client_type: str):
        if client_type in self.active_connections:
            try:
                self.active_connections[client_type].remove(websocket)
                logger.info(f"{client_type} disconnected, remaining: {len(self.active_connections[client_type])}")
            except ValueError:
                pass
    
    async def broadcast_to_admins(self, message: dict):
        await self.broadcast(message, "admin")
    
    async def broadcast(self, message: dict, client_type: str):
        if client_type not in self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections[client_type]:
            try:
                await connection.send_json(message)
            except RuntimeError as e:
                logger.error(f"Error sending message: {str(e)}")
                disconnected.append(connection)
            except WebSocketDisconnect:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            try:
                self.active_connections[client_type].remove(conn)
            except ValueError:
                pass

manager = ConnectionManager()

# Routes
@app.get("/")
def read_root():
    """Health check endpoint"""
    return {"status": "ok", "service": "Financial Events MCP", "time": datetime.now().isoformat()}

@app.get("/api/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "connections": {k: len(v) for k, v in manager.active_connections.items()},
        "service": "Financial Events MCP"
    }

@app.post("/api/process-sale")
async def process_sale(purchase: PurchaseEvent):
    """
    Process a new sale/purchase event
    
    This endpoint receives purchase events from the Stripe webhook handler
    and processes them for real-time dashboard updates and analytics.
    """
    logger.info(f"Received purchase event: {purchase.userId} - {purchase.totalSessionsAdded} sessions - ${purchase.totalAmount}")
    
    try:
        # Add to recent purchases list (limit to last 20)
        purchase_dict = purchase.dict()
        recent_purchases.append(purchase_dict)
        if len(recent_purchases) > 20:
            recent_purchases.pop(0)
        
        # Update basic stats
        purchase_stats["total_revenue"] += purchase.totalAmount
        purchase_stats["total_sessions"] += purchase.totalSessionsAdded
        purchase_stats["client_count"].add(purchase.userId)
        
        # Update package counts
        for package in purchase.packages:
            purchase_stats["package_counts"][package] += 1
        
        # Update time-based revenue
        hour_key = datetime.fromisoformat(purchase.timestamp).strftime("%Y-%m-%d %H:00")
        day_key = datetime.fromisoformat(purchase.timestamp).strftime("%Y-%m-%d")
        purchase_stats["hourly_revenue"][hour_key] += purchase.totalAmount
        purchase_stats["daily_revenue"][day_key] += purchase.totalAmount
        
        # Process enhanced analytics
        # Source breakdown
        purchase_stats["purchase_sources"][purchase.purchaseSource] += 1
        
        # Client type distribution
        purchase_stats["client_types"][purchase.clientType] += 1
        
        # New vs returning customers
        if purchase.isFirstPurchase:
            purchase_stats["new_vs_returning"]["new"] += 1
        else:
            purchase_stats["new_vs_returning"]["returning"] += 1
        
        # Region breakdown
        if purchase.userDemographics and purchase.userDemographics.region:
            purchase_stats["region_breakdown"][purchase.userDemographics.region] += purchase.totalAmount
        
        # Package type distribution
        if purchase.packageDetails:
            for pkg in purchase.packageDetails:
                if pkg.type:
                    purchase_stats["package_type_distribution"][pkg.type] += 1
        
        # Calculate average package value (rolling average)
        # Formula: new_avg = old_avg + (new_value - old_avg) / new_count
        current_count = len(recent_purchases)
        if current_count > 1:
            purchase_stats["average_package_value"] += (
                (purchase.totalAmount - purchase_stats["average_package_value"]) / current_count
            )
        else:
            purchase_stats["average_package_value"] = purchase.totalAmount
            
        # Update popular packages (maintain sorted list of top packages by revenue)
        # This would be more sophisticated in a real database implementation
        # Simplified version for in-memory demonstration
        package_revenue = {}
        for purchase_record in recent_purchases:
            for package_detail in purchase_record.get("packageDetails", []):
                pkg_name = package_detail.get("name", "Unknown")
                pkg_revenue = package_detail.get("price", 0) * package_detail.get("quantity", 1)
                package_revenue[pkg_name] = package_revenue.get(pkg_name, 0) + pkg_revenue
                
        purchase_stats["popular_packages"] = sorted(
            [{"name": k, "revenue": v} for k, v in package_revenue.items()],
            key=lambda x: x["revenue"],
            reverse=True
        )[:5]  # Top 5 packages by revenue
        
        # Create enhanced admin dashboard update with more detailed information
        admin_update = {
            "type": "purchase",
            "data": {
                "userId": purchase.userId,
                "userName": purchase.userName,
                "email": purchase.email,
                "sessionsPurchased": purchase.totalSessionsAdded,
                "packageNames": purchase.packages,
                "amount": purchase.totalAmount,
                "timestamp": purchase.timestamp,
                "clientType": purchase.clientType,
                "isFirstPurchase": purchase.isFirstPurchase,
                "region": purchase.userDemographics.region if purchase.userDemographics else "unknown",
                "packageDetails": [pkg.dict() for pkg in purchase.packageDetails] if purchase.packageDetails else []
            }
        }
        
        # Broadcast update to admin dashboard
        await manager.broadcast_to_admins(admin_update)
        
        # Also broadcast a stats update so dashboards show current analytics
        await broadcast_stats_update()
        
        # Integrate with Gamification MCP to award points and achievements for purchase
        try:
            await trigger_gamification_rewards(purchase)
        except Exception as game_error:
            logger.warning(f"Failed to trigger gamification rewards: {str(game_error)}")
        
        # Generate AI-powered client insights if orientation data is provided
        if purchase.orientationData or purchase.isFirstPurchase:
            try:
                await generate_client_insights(purchase)
            except Exception as insight_error:
                logger.warning(f"Failed to generate client insights: {str(insight_error)}")
        
        # Suggest trainer matching if no trainer is assigned
        if not purchase.assignedTrainerId and purchase.totalSessionsAdded > 0:
            try:
                await recommend_trainers(purchase)
            except Exception as trainer_error:
                logger.warning(f"Failed to generate trainer recommendations: {str(trainer_error)}")
        
        # Suggest initial session slots if sessions were purchased
        if purchase.totalSessionsAdded > 0:
            try:
                await suggest_session_slots(purchase)
            except Exception as session_error:
                logger.warning(f"Failed to suggest session slots: {str(session_error)}")
        
        return {"success": True, "message": "Purchase processed successfully", "purchaseId": purchase.cartId}
    
    except Exception as e:
        logger.error(f"Error processing purchase: {str(e)}")
        return {"success": False, "message": f"Error processing purchase: {str(e)}"}

@app.get("/api/recent-purchases")
def get_recent_purchases():
    """Get list of recent purchases for admin dashboard"""
    return {"success": True, "data": recent_purchases}

@app.get("/api/purchase-stats")
def get_purchase_stats():
    """Get aggregate purchase statistics"""
    # Convert set to len for JSON serialization
    stats_copy = purchase_stats.copy()
    stats_copy["client_count"] = len(purchase_stats["client_count"])
    
    # Convert defaultdicts to regular dicts for JSON serialization
    for key in ["package_counts", "hourly_revenue", "daily_revenue", 
               "purchase_sources", "client_types", "region_breakdown",
               "package_type_distribution"]:
        if key in stats_copy:
            stats_copy[key] = dict(stats_copy[key])
    
    # Add additional calculated metrics
    # Calculate recent growth rate (comparing last 24h to previous 24h)
    now = datetime.now()
    today_key = now.strftime("%Y-%m-%d")
    yesterday_key = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    today_revenue = stats_copy["daily_revenue"].get(today_key, 0)
    yesterday_revenue = stats_copy["daily_revenue"].get(yesterday_key, 0)
    
    if yesterday_revenue > 0:
        stats_copy["daily_growth_rate"] = ((today_revenue - yesterday_revenue) / yesterday_revenue) * 100
    else:
        stats_copy["daily_growth_rate"] = 100 if today_revenue > 0 else 0
    
    # Calculate projected monthly revenue based on current daily average
    current_month = now.strftime("%Y-%m")
    current_month_days = [day for day in stats_copy["daily_revenue"].keys() if day.startswith(current_month)]
    current_month_revenue = sum(stats_copy["daily_revenue"][day] for day in current_month_days)
    days_in_month = 30  # Simplified for demonstration
    days_so_far = len(current_month_days)
    
    if days_so_far > 0:
        daily_average = current_month_revenue / days_so_far
        stats_copy["projected_monthly_revenue"] = daily_average * days_in_month
    else:
        stats_copy["projected_monthly_revenue"] = 0
    
    return {"success": True, "data": stats_copy}

# Helper function to broadcast stats updates to all admin clients
async def broadcast_stats_update():
    """Broadcast current stats to all connected admin clients"""
    try:
        # Convert set to len for JSON serialization
        stats_copy = purchase_stats.copy()
        stats_copy["client_count"] = len(purchase_stats["client_count"])
        
        # Convert defaultdicts to regular dicts for JSON serialization
        for key in ["package_counts", "hourly_revenue", "daily_revenue", 
                   "purchase_sources", "client_types", "region_breakdown",
                   "package_type_distribution"]:
            if key in stats_copy:
                stats_copy[key] = dict(stats_copy[key])
        
        # Send stats update to all admin clients
        await manager.broadcast_to_admins({
            "type": "stats_update",
            "data": stats_copy
        })
    except Exception as e:
        logger.error(f"Error broadcasting stats update: {str(e)}")

@app.websocket("/ws/admin-dashboard")
async def admin_dashboard_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time admin dashboard updates"""
    await manager.connect(websocket, "admin")
    try:
        # Send initial stats on connection
        stats_copy = purchase_stats.copy()
        stats_copy["client_count"] = len(purchase_stats["client_count"])
        
        # Convert defaultdicts to regular dicts for JSON serialization
        for key in ["package_counts", "hourly_revenue", "daily_revenue", 
                   "purchase_sources", "client_types", "region_breakdown",
                   "package_type_distribution"]:
            if key in stats_copy:
                stats_copy[key] = dict(stats_copy[key])
        
        # Calculate additional metrics for initial dashboard state
        # Calculate recent growth rate (comparing last 24h to previous 24h)
        now = datetime.now()
        today_key = now.strftime("%Y-%m-%d")
        yesterday_key = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        today_revenue = stats_copy["daily_revenue"].get(today_key, 0)
        yesterday_revenue = stats_copy["daily_revenue"].get(yesterday_key, 0)
        
        if yesterday_revenue > 0:
            stats_copy["daily_growth_rate"] = ((today_revenue - yesterday_revenue) / yesterday_revenue) * 100
        else:
            stats_copy["daily_growth_rate"] = 100 if today_revenue > 0 else 0
        
        # Calculate projected monthly revenue based on current daily average
        current_month = now.strftime("%Y-%m")
        current_month_days = [day for day in stats_copy["daily_revenue"].keys() if day.startswith(current_month)]
        current_month_revenue = sum(stats_copy["daily_revenue"][day] for day in current_month_days)
        days_in_month = 30  # Simplified for demonstration
        days_so_far = len(current_month_days)
        
        if days_so_far > 0:
            daily_average = current_month_revenue / days_so_far
            stats_copy["projected_monthly_revenue"] = daily_average * days_in_month
        else:
            stats_copy["projected_monthly_revenue"] = 0
        
        await websocket.send_json({
            "type": "initial_stats",
            "data": {
                "stats": stats_copy,
                "recent_purchases": recent_purchases
            }
        })
        
        # Keep connection alive with ping-pong and handle requests
        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
                else:
                    try:
                        json_data = json.loads(data)
                        request_type = json_data.get("type")
                        
                        if request_type == "get_stats":
                            # Handle request for updated stats
                            stats_copy = purchase_stats.copy()
                            stats_copy["client_count"] = len(purchase_stats["client_count"])
                            
                            # Convert defaultdicts to regular dicts for JSON serialization
                            for key in ["package_counts", "hourly_revenue", "daily_revenue", 
                                       "purchase_sources", "client_types", "region_breakdown",
                                       "package_type_distribution"]:
                                if key in stats_copy:
                                    stats_copy[key] = dict(stats_copy[key])
                            
                            # Add calculated metrics as in get_purchase_stats()
                            now = datetime.now()
                            today_key = now.strftime("%Y-%m-%d")
                            yesterday_key = (now - timedelta(days=1)).strftime("%Y-%m-%d")
                            today_revenue = stats_copy["daily_revenue"].get(today_key, 0)
                            yesterday_revenue = stats_copy["daily_revenue"].get(yesterday_key, 0)
                            
                            if yesterday_revenue > 0:
                                stats_copy["daily_growth_rate"] = ((today_revenue - yesterday_revenue) / yesterday_revenue) * 100
                            else:
                                stats_copy["daily_growth_rate"] = 100 if today_revenue > 0 else 0
                            
                            current_month = now.strftime("%Y-%m")
                            current_month_days = [day for day in stats_copy["daily_revenue"].keys() if day.startswith(current_month)]
                            current_month_revenue = sum(stats_copy["daily_revenue"][day] for day in current_month_days)
                            days_in_month = 30  # Simplified for demonstration
                            days_so_far = len(current_month_days)
                            
                            if days_so_far > 0:
                                daily_average = current_month_revenue / days_so_far
                                stats_copy["projected_monthly_revenue"] = daily_average * days_in_month
                            else:
                                stats_copy["projected_monthly_revenue"] = 0
                            
                            await websocket.send_json({
                                "type": "stats_update",
                                "data": {
                                    "stats": stats_copy,
                                    "recent_purchases": recent_purchases
                                }
                            })
                        elif request_type == "filter_stats":
                            # Handle filtering stats by date range or other criteria
                            filters = json_data.get("filters", {})
                            date_from = filters.get("date_from")
                            date_to = filters.get("date_to")
                            
                            # Example of filtering daily revenue by date range
                            if date_from and date_to:
                                filtered_daily_revenue = {}
                                for day, amount in dict(purchase_stats["daily_revenue"]).items():
                                    if date_from <= day <= date_to:
                                        filtered_daily_revenue[day] = amount
                                
                                await websocket.send_json({
                                    "type": "filtered_stats",
                                    "data": {
                                        "filtered_daily_revenue": filtered_daily_revenue
                                    }
                                })
                    except json.JSONDecodeError:
                        logger.warning("Received non-JSON message from client")
            except WebSocketDisconnect:
                raise
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {str(e)}")
                # Try to continue the loop for non-fatal errors
    except WebSocketDisconnect:
        manager.disconnect(websocket, "admin")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket, "admin")

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    logger.info("Financial Events MCP Server starting up...")
    # Initialize any resources needed

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Financial Events MCP Server shutting down...")
    # Clean up resources

# Add a new endpoint for summarized insights
@app.get("/api/revenue-insights")
def get_revenue_insights():
    """Get summarized insights and trends for the admin dashboard"""
    try:
        insights = {
            "summary": {
                "total_revenue": purchase_stats["total_revenue"],
                "total_clients": len(purchase_stats["client_count"]),
                "total_sessions": purchase_stats["total_sessions"],
                "average_order_value": purchase_stats["average_package_value"],
            },
            "trends": {
                "new_vs_returning": purchase_stats["new_vs_returning"],
                "popular_packages": purchase_stats["popular_packages"],
                "client_type_distribution": dict(purchase_stats["client_types"]),
                "purchase_source_distribution": dict(purchase_stats["purchase_sources"]),
            },
            "regional": {
                "revenue_by_region": dict(purchase_stats["region_breakdown"]),
            },
            "time_series": {
                "daily_revenue": dict(purchase_stats["daily_revenue"]),
                "hourly_revenue": dict(purchase_stats["hourly_revenue"]),
            }
        }
        
        # Calculate additional insights
        # Revenue per session
        if purchase_stats["total_sessions"] > 0:
            insights["summary"]["revenue_per_session"] = purchase_stats["total_revenue"] / purchase_stats["total_sessions"]
        else:
            insights["summary"]["revenue_per_session"] = 0
            
        # Top performing day
        daily_revenue = dict(purchase_stats["daily_revenue"])
        if daily_revenue:
            top_day = max(daily_revenue.items(), key=lambda x: x[1])
            insights["trends"]["top_day"] = {
                "date": top_day[0],
                "revenue": top_day[1]
            }
        
        return {"success": True, "data": insights}
    except Exception as e:
        logger.error(f"Error generating revenue insights: {str(e)}")
        return {"success": False, "message": str(e)}

# Add an endpoint for forecasting
@app.get("/api/revenue-forecast")
def get_revenue_forecast():
    """Generate revenue forecast based on historical data"""
    try:
        # Simple forecasting model based on moving average
        # In a real implementation, this would use more sophisticated time series analysis
        daily_revenue = dict(purchase_stats["daily_revenue"])
        if not daily_revenue:
            return {"success": True, "data": {"forecast": [], "confidence": 0}}
        
        # Sort by date
        sorted_days = sorted(daily_revenue.items())
        
        # Get revenue values only
        revenues = [day[1] for day in sorted_days]
        
        # Simple moving average forecast for next 7 days
        # In production, use a proper forecasting model like ARIMA, Prophet, etc.
        window_size = min(7, len(revenues))
        if window_size > 0:
            moving_avg = sum(revenues[-window_size:]) / window_size
        else:
            moving_avg = 0
            
        # Generate forecast for next 7 days
        last_date = datetime.strptime(sorted_days[-1][0], "%Y-%m-%d")
        forecast = []
        
        for i in range(1, 8):
            forecast_date = (last_date + timedelta(days=i)).strftime("%Y-%m-%d")
            # Add some variance to the forecast
            forecast_value = moving_avg * (0.9 + 0.2 * (i / 10))
            forecast.append({
                "date": forecast_date,
                "revenue": forecast_value,
                "lower_bound": forecast_value * 0.85,  # Lower confidence bound
                "upper_bound": forecast_value * 1.15   # Upper confidence bound
            })
        
        return {
            "success": True, 
            "data": {
                "forecast": forecast,
                "confidence": 0.7,  # Confidence level (0-1)
                "method": "moving_average"
            }
        }
    except Exception as e:
        logger.error(f"Error generating revenue forecast: {str(e)}")
        return {"success": False, "message": str(e)}

# Integration with other MCP services
async def trigger_gamification_rewards(purchase: PurchaseEvent):
    """Notify the Gamification MCP about the purchase to award points and achievements"""
    try:
        gamification_mcp_url = os.environ.get("GAMIFICATION_MCP_URL", "http://localhost:8011")
        
        # For each package, prepare purchase details for gamification
        for pkg in purchase.packageDetails or []:
            purchase_points_data = {
                "userId": purchase.userId,
                "userName": purchase.userName,
                "purchaseDetails": {
                    "itemId": pkg.id,
                    "itemName": pkg.name or "Unknown Package",
                    "itemType": pkg.type or "UNKNOWN",
                    "price": pkg.price,
                    "sessions": pkg.sessions or 0
                },
                "timestamp": purchase.timestamp,
                "isFirstPurchase": purchase.isFirstPurchase
            }
            
            # Call Gamification MCP to award points for purchase
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{gamification_mcp_url}/api/award_purchase_points",
                    json=purchase_points_data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Gamification rewards processed: {result}")
                    
                    # If badges were awarded, notify admin dashboard
                    if result.get("badgesAwarded"):
                        await manager.broadcast_to_admins({
                            "type": "gamification_update",
                            "data": {
                                "userId": purchase.userId,
                                "userName": purchase.userName,
                                "badgesAwarded": result.get("badgesAwarded"),
                                "pointsAwarded": result.get("pointsAwarded"),
                                "timestamp": datetime.now().isoformat()
                            }
                        })
                else:
                    logger.warning(f"Gamification MCP returned status code {response.status_code}")
    except Exception as e:
        logger.error(f"Error in trigger_gamification_rewards: {str(e)}")
        raise

async def generate_client_insights(purchase: PurchaseEvent):
    """Generate AI-powered insights about client based on purchase and orientation data"""
    try:
        client_insights_mcp_url = os.environ.get("CLIENT_INSIGHTS_MCP_URL")
        
        # If no CLIENT_INSIGHTS_MCP_URL is configured, use a simplified local implementation
        if not client_insights_mcp_url:
            # Simplified local implementation of client insights
            # In production, this would call an actual AI/LLM-powered MCP service
            insights = generate_basic_client_insights(purchase)
            
            # Broadcast insights to admin dashboard
            await manager.broadcast_to_admins({
                "type": "client_insights",
                "data": {
                    "userId": purchase.userId,
                    "userName": purchase.userName,
                    "insights": insights.get("insights", []),
                    "motivationFactors": insights.get("motivationFactors", []),
                    "communicationStyle": insights.get("communicationStyle", "standard"),
                    "timestamp": datetime.now().isoformat()
                }
            })
            logger.info(f"Generated basic client insights for user {purchase.userId}")
            return
        
        # If we have a CLIENT_INSIGHTS_MCP_URL, make a real call
        async with httpx.AsyncClient(timeout=15.0) as client:
            insight_data = {
                "userId": purchase.userId,
                "userName": purchase.userName,
                "email": purchase.email,
                "purchaseData": {
                    "totalSessionsAdded": purchase.totalSessionsAdded,
                    "packages": purchase.packages,
                    "totalAmount": purchase.totalAmount,
                    "packageDetails": [pkg.dict() for pkg in purchase.packageDetails] if purchase.packageDetails else []
                },
                "isFirstPurchase": purchase.isFirstPurchase,
                "orientationData": purchase.orientationData or {},
                "userDemographics": purchase.userDemographics.dict() if purchase.userDemographics else {}
            }
            
            response = await client.post(
                f"{client_insights_mcp_url}/api/enrich-client-profile",
                json=insight_data
            )
            
            if response.status_code == 200:
                insights = response.json()
                logger.info(f"Client insights generated: {insights}")
                
                # Broadcast insights to admin dashboard
                await manager.broadcast_to_admins({
                    "type": "client_insights",
                    "data": {
                        "userId": purchase.userId,
                        "userName": purchase.userName,
                        "insights": insights.get("insights"),
                        "timestamp": datetime.now().isoformat()
                    }
                })
            else:
                logger.warning(f"Client Insights MCP returned status code {response.status_code}")
    except Exception as e:
        logger.error(f"Error in generate_client_insights: {str(e)}")
        raise

def generate_basic_client_insights(purchase: PurchaseEvent):
    """Generate basic client insights without an external AI MCP"""
    # This is a simplified implementation that would normally use AI/LLM
    # In production, the Client Insights MCP would handle this with more sophistication
    
    # Basic motivation factors based on purchase behavior
    motivation_factors = []
    if purchase.isFirstPurchase:
        motivation_factors.append("Initial commitment to fitness journey")
    
    if purchase.totalSessionsAdded > 10:
        motivation_factors.append("High investment in training")
        communication_style = "Direct and detailed"
    elif purchase.totalSessionsAdded > 5:
        motivation_factors.append("Moderate investment in training")
        communication_style = "Balanced communication"
    else:
        motivation_factors.append("Starting with a smaller commitment")
        communication_style = "Supportive and encouraging"
    
    # Check for premium client type
    if purchase.clientType == "premium":
        motivation_factors.append("Values premium services")
    
    # Basic insights
    insights = [
        {
            "category": "Purchase Behavior",
            "insight": f"Client invested in {purchase.totalSessionsAdded} sessions, showing {motivation_factors[0].lower()}"
        },
        {
            "category": "Communication",
            "insight": f"Recommended approach: {communication_style}"
        }
    ]
    
    # Add insight about package preference
    for pkg in purchase.packageDetails or []:
        if pkg.name and "Elite" in pkg.name:
            insights.append({
                "category": "Package Preference",
                "insight": "Client selected an elite package, may be looking for premium experience"
            })
            break
    
    return {
        "insights": insights,
        "motivationFactors": motivation_factors,
        "communicationStyle": communication_style,
        "recommendedApproach": "Personalized training plan with regular check-ins"
    }

async def recommend_trainers(purchase: PurchaseEvent):
    """Recommend suitable trainers for the client based on purchase and profile data"""
    try:
        trainer_matching_mcp_url = os.environ.get("TRAINER_MATCHING_MCP_URL")
        
        # If no dedicated TRAINER_MATCHING_MCP_URL is configured, use simplified local implementation
        if not trainer_matching_mcp_url:
            # Simplified local implementation
            # In production, this would call a dedicated Trainer Matching MCP with ML capabilities
            trainer_recommendations = generate_basic_trainer_recommendations(purchase)
            
            # Broadcast recommendations to admin dashboard
            await manager.broadcast_to_admins({
                "type": "trainer_recommendations",
                "data": {
                    "userId": purchase.userId,
                    "userName": purchase.userName,
                    "recommendations": trainer_recommendations,
                    "timestamp": datetime.now().isoformat()
                }
            })
            logger.info(f"Generated basic trainer recommendations for user {purchase.userId}")
            return
        
        # If we have a TRAINER_MATCHING_MCP_URL, make a real call
        async with httpx.AsyncClient(timeout=15.0) as client:
            matching_data = {
                "userId": purchase.userId,
                "userName": purchase.userName,
                "packageDetails": [pkg.dict() for pkg in purchase.packageDetails] if purchase.packageDetails else [],
                "orientationData": purchase.orientationData or {},
                "userDemographics": purchase.userDemographics.dict() if purchase.userDemographics else {}
            }
            
            response = await client.post(
                f"{trainer_matching_mcp_url}/api/recommend-trainer-match",
                json=matching_data
            )
            
            if response.status_code == 200:
                recommendations = response.json()
                logger.info(f"Trainer recommendations generated: {recommendations}")
                
                # Broadcast recommendations to admin dashboard
                await manager.broadcast_to_admins({
                    "type": "trainer_recommendations",
                    "data": {
                        "userId": purchase.userId,
                        "userName": purchase.userName,
                        "recommendations": recommendations.get("recommendations", []),
                        "timestamp": datetime.now().isoformat()
                    }
                })
            else:
                logger.warning(f"Trainer Matching MCP returned status code {response.status_code}")
    except Exception as e:
        logger.error(f"Error in recommend_trainers: {str(e)}")
        raise

def generate_basic_trainer_recommendations(purchase: PurchaseEvent):
    """Generate basic trainer recommendations without an external MCP"""
    # This is a simplified implementation
    # In production, this would use a sophisticated matching algorithm in the Trainer Matching MCP
    
    # Mock trainer data (in production, this would be fetched from the database)
    mock_trainers = [
        {
            "trainerId": "trainer-001",
            "trainerName": "Alex Johnson",
            "specialties": ["Strength Training", "HIIT", "Weight Loss"],
            "availability": {"mornings": True, "evenings": True, "weekends": False}
        },
        {
            "trainerId": "trainer-002",
            "trainerName": "Samantha Lee",
            "specialties": ["Yoga", "Pilates", "Rehabilitation"],
            "availability": {"mornings": False, "evenings": True, "weekends": True}
        },
        {
            "trainerId": "trainer-003",
            "trainerName": "Marcus Wilson",
            "specialties": ["Sports Performance", "CrossFit", "Nutrition"],
            "availability": {"mornings": True, "evenings": False, "weekends": True}
        }
    ]
    
    # Determine client needs based on purchase (this would normally come from orientation data)
    client_needs = []
    for pkg in purchase.packageDetails or []:
        if pkg.name and "Elite" in pkg.name:
            client_needs.append("Premium Training Experience")
        if pkg.sessions > 10:
            client_needs.append("Long-term Commitment")
    
    # Simple scoring algorithm
    recommendations = []
    for trainer in mock_trainers:
        # Generate a random match score between 0.7 and 0.95 for demonstration
        match_score = round(random.uniform(0.7, 0.95), 2)
        
        # Generate generic reasons for the match
        reasons = [f"Specialized in {specialty}" for specialty in trainer["specialties"][:2]]
        
        if "Premium Training Experience" in client_needs and "Strength Training" in trainer["specialties"]:
            reasons.append("Experienced with premium clients")
            match_score = min(match_score + 0.1, 1.0)  # Boost score but cap at 1.0
        
        if "Long-term Commitment" in client_needs and trainer["availability"]["weekends"]:
            reasons.append("Available on weekends for consistent scheduling")
            match_score = min(match_score + 0.05, 1.0)  # Small boost
        
        recommendations.append({
            "trainerId": trainer["trainerId"],
            "trainerName": trainer["trainerName"],
            "matchScore": match_score,
            "reasons": reasons,
            "specialties": trainer["specialties"],
            "availability": trainer["availability"]
        })
    
    # Sort by match score
    recommendations.sort(key=lambda x: x["matchScore"], reverse=True)
    return recommendations[:2]  # Return top 2 recommendations

async def suggest_session_slots(purchase: PurchaseEvent):
    """Suggest initial session slots based on client and trainer availability"""
    try:
        scheduling_mcp_url = os.environ.get("SCHEDULING_ASSIST_MCP_URL")
        
        # If no SCHEDULING_ASSIST_MCP_URL is configured, use simplified local implementation
        if not scheduling_mcp_url:
            # Simplified local implementation
            # In production, this would call a dedicated Scheduling Assist MCP
            session_recommendations = generate_basic_session_recommendations(purchase)
            
            # Broadcast recommendations to admin dashboard
            await manager.broadcast_to_admins({
                "type": "session_recommendations",
                "data": {
                    "userId": purchase.userId,
                    "userName": purchase.userName,
                    "sessionRecommendations": session_recommendations,
                    "timestamp": datetime.now().isoformat()
                }
            })
            logger.info(f"Generated basic session recommendations for user {purchase.userId}")
            return
        
        # If we have a SCHEDULING_ASSIST_MCP_URL, make a real call
        async with httpx.AsyncClient(timeout=15.0) as client:
            scheduling_data = {
                "userId": purchase.userId,
                "packageId": purchase.cartId,
                "sessionCount": purchase.totalSessionsAdded,
                "assignedTrainerId": purchase.assignedTrainerId,
                "orientationData": purchase.orientationData or {}
            }
            
            response = await client.post(
                f"{scheduling_mcp_url}/api/suggest-session-slots",
                json=scheduling_data
            )
            
            if response.status_code == 200:
                recommendations = response.json()
                logger.info(f"Session slot recommendations generated: {recommendations}")
                
                # Broadcast recommendations to admin dashboard
                await manager.broadcast_to_admins({
                    "type": "session_recommendations",
                    "data": {
                        "userId": purchase.userId,
                        "userName": purchase.userName,
                        "recommendations": recommendations.get("recommendedSlots", []),
                        "timestamp": datetime.now().isoformat()
                    }
                })
            else:
                logger.warning(f"Scheduling Assist MCP returned status code {response.status_code}")
    except Exception as e:
        logger.error(f"Error in suggest_session_slots: {str(e)}")
        raise

def generate_basic_session_recommendations(purchase: PurchaseEvent):
    """Generate basic session slot recommendations without an external MCP"""
    # This is a simplified implementation
    # In production, this would use a sophisticated scheduling algorithm in the Scheduling Assist MCP
    
    # Get current date and time
    now = datetime.now()
    
    # Generate 3 time slots in the next 7 days
    recommended_slots = []
    for i in range(1, 4):  # 3 recommendations
        # Day offset (1 to 7 days from now)
        day_offset = i * 2  # Every other day starting from tomorrow
        
        # Session time (alternate between morning and evening)
        if i % 2 == 0:
            hour = 9  # Morning session
            am_pm = "AM"
        else:
            hour = 18  # Evening session
            am_pm = "PM"
        
        # Calculate the date/time
        session_date = now + timedelta(days=day_offset)
        session_datetime = session_date.replace(hour=hour, minute=0, second=0, microsecond=0)
        
        # Format in a user-friendly way
        formatted_date = session_datetime.strftime("%A, %B %d, %Y")
        formatted_time = f"{hour}:00 {am_pm}"
        
        recommended_slots.append({
            "dateTime": session_datetime.isoformat(),
            "formattedDate": formatted_date,
            "formattedTime": formatted_time,
            "trainerAvailable": True,  # In a real implementation, this would be checked
            "recommendationReason": f"Popular {am_pm.lower()} time slot"
        })
    
    return {
        "recommendedSlots": recommended_slots,
        "recommendationRationale": "Based on typical availability patterns",
        "message": f"Here are {len(recommended_slots)} suggested time slots for your first session."
    }

# Main entry point
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8010))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
