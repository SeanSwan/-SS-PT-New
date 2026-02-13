# Testing the Enhanced Financial Events MCP

This guide provides step-by-step instructions for testing the enhanced Financial Events MCP functionality, focusing on the new features like gamification integration, client insights, trainer matching, and session scheduling.

## Prerequisites

1. Make sure the Financial Events MCP server is running:
   ```
   ./start-financial-events-mcp.bat
   ```

2. If you want to test integration with other MCP services, make sure they are running as well:
   - Gamification MCP (port 8011)
   - Client Insights MCP (port 8012)
   - Trainer Matching MCP (port 8013)
   - Scheduling Assist MCP (port 8014)

> **Note**: The Financial Events MCP will work even if these other services are not running, as it has fallback implementations.

## Option 1: Using the Test Utility

The simplest way to test is using the provided test utility:

1. Open a terminal in the project root directory
2. Run the test utility:
   ```
   node test-stripe-mcp.mjs
   ```
3. From the menu, select option 1 to test the Financial Events MCP directly
4. The utility will generate mock purchase data and send it to the MCP
5. Check the MCP server logs to see the processing of the purchase
6. Select option 4 to fetch MCP stats and verify they were updated

## Option 2: Manual API Testing with cURL or Postman

### Testing the Purchase Processing API

1. Send a POST request to `http://localhost:8010/api/process-sale` with the following JSON body:

```json
{
  "userId": "test-user-123",
  "cartId": "test-cart-456",
  "userName": "Test User",
  "email": "testuser@example.com",
  "totalSessionsAdded": 10,
  "packages": ["Premium Training Package"],
  "totalAmount": 499.99,
  "timestamp": "2025-05-20T12:34:56Z",
  "clientType": "premium",
  "purchaseSource": "web",
  "isFirstPurchase": true,
  "packageDetails": [
    {
      "id": "pkg-123",
      "name": "Premium Training Package",
      "type": "TRAINING_PACKAGE_FIXED",
      "sessions": 10,
      "price": 499.99,
      "quantity": 1
    }
  ],
  "userDemographics": {
    "joinDate": "2025-04-15T10:30:00Z",
    "region": "North America"
  },
  "orientationData": {
    "fitnessGoals": ["Weight Loss", "Muscle Gain"],
    "availabilityPreferences": ["Mornings", "Weekends"],
    "experienceLevel": "Beginner"
  }
}
```

**Using cURL:**
```bash
curl -X POST http://localhost:8010/api/process-sale \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-123","cartId":"test-cart-456","userName":"Test User","email":"testuser@example.com","totalSessionsAdded":10,"packages":["Premium Training Package"],"totalAmount":499.99,"timestamp":"2025-05-20T12:34:56Z","clientType":"premium","purchaseSource":"web","isFirstPurchase":true,"packageDetails":[{"id":"pkg-123","name":"Premium Training Package","type":"TRAINING_PACKAGE_FIXED","sessions":10,"price":499.99,"quantity":1}],"userDemographics":{"joinDate":"2025-04-15T10:30:00Z","region":"North America"},"orientationData":{"fitnessGoals":["Weight Loss","Muscle Gain"],"availabilityPreferences":["Mornings","Weekends"],"experienceLevel":"Beginner"}}'
```

### Testing the Stats API

2. Get the purchase stats by sending a GET request to `http://localhost:8010/api/purchase-stats`:

**Using cURL:**
```bash
curl http://localhost:8010/api/purchase-stats
```

### Testing the Revenue Insights API

3. Get the revenue insights by sending a GET request to `http://localhost:8010/api/revenue-insights`:

**Using cURL:**
```bash
curl http://localhost:8010/api/revenue-insights
```

### Testing the Forecast API

4. Get the revenue forecast by sending a GET request to `http://localhost:8010/api/revenue-forecast`:

**Using cURL:**
```bash
curl http://localhost:8010/api/revenue-forecast
```

## Option 3: Testing with WebSocket Connection

To test the WebSocket connection and real-time updates:

1. Create an HTML file with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Financial MCP WebSocket Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        #messages { border: 1px solid #ccc; padding: 10px; height: 400px; overflow-y: auto; margin-bottom: 10px; }
        button { padding: 8px 16px; margin-right: 10px; }
    </style>
</head>
<body>
    <h1>Financial MCP WebSocket Test</h1>
    <div id="status">WebSocket Status: Disconnected</div>
    <div id="messages"></div>
    <button id="connect">Connect</button>
    <button id="ping">Send Ping</button>
    <button id="stats">Request Stats</button>
    <button id="test">Send Test Purchase</button>
    <button id="disconnect">Disconnect</button>

    <script>
        let socket;
        const messagesDiv = document.getElementById('messages');
        const statusDiv = document.getElementById('status');
        
        function addMessage(message) {
            const messageEl = document.createElement('div');
            messageEl.textContent = message;
            messagesDiv.appendChild(messageEl);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        function addJsonMessage(prefix, jsonData) {
            const messageEl = document.createElement('div');
            messageEl.innerHTML = `<strong>${prefix}</strong>: <pre>${JSON.stringify(jsonData, null, 2)}</pre>`;
            messagesDiv.appendChild(messageEl);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        document.getElementById('connect').addEventListener('click', () => {
            if (socket) {
                addMessage('WebSocket already connected. Disconnect first.');
                return;
            }
            
            socket = new WebSocket('ws://localhost:8010/ws/admin-dashboard');
            
            socket.onopen = () => {
                statusDiv.textContent = 'WebSocket Status: Connected';
                addMessage('WebSocket connection established');
            };
            
            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                addJsonMessage('Received', data);
            };
            
            socket.onclose = () => {
                statusDiv.textContent = 'WebSocket Status: Disconnected';
                addMessage('WebSocket connection closed');
                socket = null;
            };
            
            socket.onerror = (error) => {
                statusDiv.textContent = 'WebSocket Status: Error';
                addMessage('WebSocket error: ' + error);
            };
        });
        
        document.getElementById('ping').addEventListener('click', () => {
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                addMessage('WebSocket not connected');
                return;
            }
            
            socket.send('ping');
            addMessage('Sent: ping');
        });
        
        document.getElementById('stats').addEventListener('click', () => {
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                addMessage('WebSocket not connected');
                return;
            }
            
            socket.send(JSON.stringify({ type: 'get_stats' }));
            addMessage('Requested stats update');
        });
        
        document.getElementById('test').addEventListener('click', () => {
            fetch('http://localhost:8010/api/process-sale', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "userId": "test-user-" + Date.now(),
                    "cartId": "test-cart-" + Date.now(),
                    "userName": "Test User",
                    "email": "testuser@example.com",
                    "totalSessionsAdded": 10,
                    "packages": ["Premium Training Package"],
                    "totalAmount": 499.99,
                    "timestamp": new Date().toISOString(),
                    "clientType": "premium",
                    "purchaseSource": "web",
                    "isFirstPurchase": true,
                    "packageDetails": [
                        {
                            "id": "pkg-123",
                            "name": "Premium Training Package",
                            "type": "TRAINING_PACKAGE_FIXED",
                            "sessions": 10,
                            "price": 499.99,
                            "quantity": 1
                        }
                    ],
                    "userDemographics": {
                        "joinDate": new Date(Date.now() - 30*24*60*60*1000).toISOString(),
                        "region": "North America"
                    },
                    "orientationData": {
                        "fitnessGoals": ["Weight Loss", "Muscle Gain"],
                        "availabilityPreferences": ["Mornings", "Weekends"],
                        "experienceLevel": "Beginner"
                    }
                })
            })
            .then(response => response.json())
            .then(data => {
                addJsonMessage('Test purchase response', data);
            })
            .catch(error => {
                addMessage('Error sending test purchase: ' + error);
            });
        });
        
        document.getElementById('disconnect').addEventListener('click', () => {
            if (!socket) {
                addMessage('WebSocket not connected');
                return;
            }
            
            socket.close();
            addMessage('WebSocket disconnected');
        });
    </script>
</body>
</html>
```

2. Open this HTML file in a browser
3. Click "Connect" to establish a WebSocket connection
4. Click "Test Purchase" to send a test purchase event
5. Observe the real-time updates received via WebSocket
6. Click "Request Stats" to get current statistics

## Verifying MCP Integration

When processing a purchase, check the MCP server logs for:

1. **Gamification Integration**: Look for log entries like:
   ```
   INFO:financial_events_mcp:Gamification rewards processed: {...}
   ```

2. **Client Insights**: Look for log entries like:
   ```
   INFO:financial_events_mcp:Generated basic client insights for user user-123
   ```

3. **Trainer Recommendations**: Look for log entries like:
   ```
   INFO:financial_events_mcp:Generated basic trainer recommendations for user user-123
   ```

4. **Session Recommendations**: Look for log entries like:
   ```
   INFO:financial_events_mcp:Generated basic session recommendations for user user-123
   ```

If any of the external MCP services are not available, you'll see warning logs like:
```
WARNING:financial_events_mcp:Failed to trigger gamification rewards: ...
```

However, the system will continue to function using the fallback implementations.

## Troubleshooting

If you encounter any issues:

1. **Port conflicts**: Make sure no other services are running on port 8010
2. **Connection refused**: Verify the Financial Events MCP server is running
3. **Integration errors**: Check that the environment variables are set correctly
4. **Missing dependencies**: Run `pip install -r requirements.txt` to ensure all dependencies are installed
5. **WebSocket errors**: Check that your browser supports WebSockets

For any persistent issues, check the MCP server logs for detailed error messages.
