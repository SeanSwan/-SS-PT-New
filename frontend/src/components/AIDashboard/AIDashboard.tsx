/**
 * AI Monitoring Dashboard
 * Real-time monitoring of AI feature performance and usage
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, LinearProgress, Switch,
  FormControlLabel, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Tooltip
} from '@mui/material';
import {
  Refresh, Speed, TrendingUp, Timeline, Assessment,
  CheckCircle, Error, Warning, Notifications,
  BarChart, Analytics, MonitorHeart
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart, Pie,
  Cell, Legend
} from 'recharts';

// Styled Components
const DashboardContainer = styled(Box)`
  background: rgba(20, 20, 40, 0.9);
  border-radius: 16px;
  padding: 2rem;
  min-height: 600px;
  color: white;
`;

const MetricCard = styled(Card)`
  background: rgba(30, 30, 60, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  height: 100%;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.1);
  }
`;

const StatusChip = styled(Chip)`
  && {
    background: ${props => 
      props.status === 'healthy' ? 'rgba(76, 175, 80, 0.2)' :
      props.status === 'degraded' ? 'rgba(255, 152, 0, 0.2)' :
      'rgba(244, 67, 54, 0.2)'};
    color: ${props => 
      props.status === 'healthy' ? '#4caf50' :
      props.status === 'degraded' ? '#ff9800' :
      '#f44336'};
    border: 1px solid ${props => 
      props.status === 'healthy' ? '#4caf50' :
      props.status === 'degraded' ? '#ff9800' :
      '#f44336'};
    font-weight: 500;
  }
`;

const AIDashboard = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // State management
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [trends, setTrends] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);
  
  // Chart colors
  const COLORS = ['#00ffff', '#7851a9', '#ff6b9d', '#4caf50', '#ff9800'];
  
  // Load data on mount and setup auto-refresh
  useEffect(() => {
    loadAllData();
    
    if (autoRefresh) {
      const interval = setInterval(loadAllData, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh]);
  
  /**
   * Load all monitoring data
   */
  const loadAllData = async () => {
    try {
      setIsLoading(true);
      
      // Load metrics, health, and trends in parallel
      const [metricsRes, healthRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ai-monitoring/metrics`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ai-monitoring/health`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);\n      \n      if (metricsRes.ok) {\n        const metricsData = await metricsRes.json();\n        setMetrics(metricsData);\n      }\n      \n      if (healthRes.ok) {\n        const healthData = await healthRes.json();\n        setHealth(healthData);\n      }\n      \n      // Load trends for each feature\n      const trendPromises = ['workoutGeneration', 'progressAnalysis', 'nutritionPlanning', 'exerciseAlternatives'].map(async (feature) => {\n        try {\n          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ai-monitoring/trends/${feature}?timeRange=24h`, {\n            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }\n          });\n          if (res.ok) {\n            const data = await res.json();\n            return { [feature]: data.trends };\n          }\n        } catch (error) {\n          console.error(`Error loading trends for ${feature}:`, error);\n        }\n        return {};\n      });\n      \n      const trendsResults = await Promise.all(trendPromises);\n      const allTrends = trendsResults.reduce((acc, trend) => ({ ...acc, ...trend }), {});\n      setTrends(allTrends);\n      \n    } catch (error) {\n      console.error('Error loading monitoring data:', error);\n      enqueueSnackbar('Failed to load monitoring data', { variant: 'error' });\n    } finally {\n      setIsLoading(false);\n    }\n  };\n  \n  /**\n   * Handle manual refresh\n   */\n  const handleRefresh = () => {\n    if (!isLoading) {\n      loadAllData();\n      enqueueSnackbar('Data refreshed', { variant: 'success' });\n    }\n  };\n  \n  /**\n   * Reset all metrics (admin only)\n   */\n  const resetMetrics = async () => {\n    if (user.role !== 'admin') {\n      enqueueSnackbar('Admin access required', { variant: 'error' });\n      return;\n    }\n    \n    try {\n      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ai-monitoring/reset`, {\n        method: 'POST',\n        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }\n      });\n      \n      if (response.ok) {\n        enqueueSnackbar('Metrics reset successfully', { variant: 'success' });\n        loadAllData();\n      } else {\n        enqueueSnackbar('Failed to reset metrics', { variant: 'error' });\n      }\n    } catch (error) {\n      console.error('Error resetting metrics:', error);\n      enqueueSnackbar('Error resetting metrics', { variant: 'error' });\n    }\n  };\n  \n  /**\n   * Format numbers for display\n   */\n  const formatNumber = (num) => {\n    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';\n    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';\n    return num.toLocaleString();\n  };\n  \n  /**\n   * Render overview metrics\n   */\n  const renderOverview = () => {\n    if (!metrics) return null;\n    \n    const overviewData = [\n      {\n        title: 'Total Requests',\n        value: formatNumber(metrics.overview.totalRequests),\n        icon: <Assessment />,\n        color: '#00ffff'\n      },\n      {\n        title: 'Success Rate',\n        value: metrics.overview.successRate,\n        icon: <CheckCircle />,\n        color: '#4caf50'\n      },\n      {\n        title: 'Avg Response Time',\n        value: metrics.overview.averageResponseTime,\n        icon: <Speed />,\n        color: '#ff9800'\n      },\n      {\n        title: 'Active Users',\n        value: formatNumber(metrics.overview.activeUsers),\n        icon: <MonitorHeart />,\n        color: '#9c27b0'\n      }\n    ];\n    \n    return (\n      <Grid container spacing={3}>\n        {overviewData.map((item, index) => (\n          <Grid item xs={12} sm={6} md={3} key={index}>\n            <MetricCard>\n              <CardContent>\n                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'between' }}>\n                  <Box>\n                    <Typography variant=\"h4\" sx={{ color: item.color, fontWeight: 'bold' }}>\n                      {item.value}\n                    </Typography>\n                    <Typography variant=\"body2\" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>\n                      {item.title}\n                    </Typography>\n                  </Box>\n                  <Box sx={{ color: item.color, opacity: 0.7 }}>\n                    {item.icon}\n                  </Box>\n                </Box>\n              </CardContent>\n            </MetricCard>\n          </Grid>\n        ))}\n      </Grid>\n    );\n  };\n  \n  /**\n   * Render feature performance table\n   */\n  const renderPerformanceTable = () => {\n    if (!metrics || !health) return null;\n    \n    return (\n      <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(30, 30, 60, 0.8)' }}>\n        <Table>\n          <TableHead>\n            <TableRow>\n              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Feature</TableCell>\n              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>\n              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Requests</TableCell>\n              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Success Rate</TableCell>\n              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Last Used</TableCell>\n            </TableRow>\n          </TableHead>\n          <TableBody>\n            {health.features.map((feature) => (\n              <TableRow key={feature.name}>\n                <TableCell sx={{ color: 'white' }}>\n                  {feature.name.replace(/([A-Z])/g, ' $1').trim()}\n                </TableCell>\n                <TableCell>\n                  <StatusChip\n                    status={feature.status}\n                    label={feature.status}\n                    size=\"small\"\n                    icon={\n                      feature.status === 'healthy' ? <CheckCircle /> :\n                      feature.status === 'degraded' ? <Warning /> :\n                      <Error />\n                    }\n                  />\n                </TableCell>\n                <TableCell sx={{ color: 'white' }}>\n                  {formatNumber(feature.requests)}\n                </TableCell>\n                <TableCell sx={{ color: 'white' }}>\n                  {feature.successRate}\n                </TableCell>\n                <TableCell sx={{ color: 'white' }}>\n                  {feature.lastUsed === 'Never' ? 'Never' : \n                   new Date(feature.lastUsed).toLocaleString()}\n                </TableCell>\n              </TableRow>\n            ))}\n          </TableBody>\n        </Table>\n      </TableContainer>\n    );\n  };\n  \n  /**\n   * Render trends charts\n   */\n  const renderTrends = () => {\n    if (!trends || Object.keys(trends).length === 0) return null;\n    \n    return (\n      <Grid container spacing={3}>\n        {Object.entries(trends).map(([feature, data], index) => (\n          <Grid item xs={12} md={6} key={feature}>\n            <MetricCard>\n              <CardContent>\n                <Typography variant=\"h6\" sx={{ color: '#00ffff', mb: 2 }}>\n                  {feature.replace(/([A-Z])/g, ' $1').trim()} - 24h Trends\n                </Typography>\n                <ResponsiveContainer width=\"100%\" height={200}>\n                  <LineChart data={data}>\n                    <CartesianGrid strokeDasharray=\"3 3\" stroke=\"rgba(255,255,255,0.1)\" />\n                    <XAxis \n                      dataKey=\"time\" \n                      stroke=\"rgba(255,255,255,0.5)\"\n                      tickFormatter={(time) => new Date(time).getHours() + 'h'}\n                    />\n                    <YAxis stroke=\"rgba(255,255,255,0.5)\" />\n                    <RechartsTooltip \n                      contentStyle={{ \n                        backgroundColor: 'rgba(30, 30, 60, 0.9)', \n                        border: '1px solid rgba(255,255,255,0.1)' \n                      }}\n                      labelFormatter={(time) => new Date(time).toLocaleString()}\n                    />\n                    <Line \n                      type=\"monotone\" \n                      dataKey=\"requests\" \n                      stroke={COLORS[index % COLORS.length]} \n                      strokeWidth={2}\n                      dot={false}\n                    />\n                  </LineChart>\n                </ResponsiveContainer>\n              </CardContent>\n            </MetricCard>\n          </Grid>\n        ))}\n      </Grid>\n    );\n  };\n  \n  /**\n   * Render system health\n   */\n  const renderHealth = () => {\n    if (!health) return null;\n    \n    return (\n      <Grid container spacing={3}>\n        <Grid item xs={12} md={8}>\n          <MetricCard>\n            <CardContent>\n              <Typography variant=\"h6\" sx={{ color: '#00ffff', mb: 2 }}>\n                System Health Overview\n              </Typography>\n              \n              <Box sx={{ mb: 3 }}>\n                <Box sx={{ display: 'flex', justifyContent: 'between', mb: 1 }}>\n                  <Typography>Overall Status</Typography>\n                  <StatusChip\n                    status={health.overall.status}\n                    label={health.overall.status.toUpperCase()}\n                    icon={\n                      health.overall.status === 'healthy' ? <CheckCircle /> :\n                      health.overall.status === 'degraded' ? <Warning /> :\n                      <Error />\n                    }\n                  />\n                </Box>\n                \n                <Typography variant=\"body2\" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>\n                  Success Rate: {health.overall.successRate} | \n                  Active Features: {health.overall.activeFeatures.length}\n                </Typography>\n              </Box>\n              \n              {health.recommendations && health.recommendations.length > 0 && (\n                <Box>\n                  <Typography variant=\"h6\" sx={{ color: '#ff9800', mb: 1 }}>\n                    Recommendations\n                  </Typography>\n                  {health.recommendations.map((rec, index) => (\n                    <Alert \n                      key={index}\n                      severity=\"info\" \n                      sx={{ \n                        mb: 1,\n                        backgroundColor: 'rgba(33, 150, 243, 0.1)',\n                        color: '#2196f3',\n                        border: '1px solid rgba(33, 150, 243, 0.3)'\n                      }}\n                    >\n                      {rec}\n                    </Alert>\n                  ))}\n                </Box>\n              )}\n            </CardContent>\n          </MetricCard>\n        </Grid>\n        \n        <Grid item xs={12} md={4}>\n          <MetricCard>\n            <CardContent>\n              <Typography variant=\"h6\" sx={{ color: '#00ffff', mb: 2 }}>\n                MCP Servers Status\n              </Typography>\n              \n              {health.overall.mcpServers && Object.entries(health.overall.mcpServers).map(([server, status]) => (\n                <Box key={server} sx={{ mb: 2 }}>\n                  <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>\n                    <Typography sx={{ color: 'white' }}>\n                      {server} MCP\n                    </Typography>\n                    <StatusChip\n                      status={status.status === 'online' ? 'healthy' : 'degraded'}\n                      label={status.status}\n                      size=\"small\"\n                    />\n                  </Box>\n                  {status.latency && (\n                    <Typography variant=\"body2\" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>\n                      Latency: {status.latency}\n                    </Typography>\n                  )}\n                </Box>\n              ))}\n            </CardContent>\n          </MetricCard>\n        </Grid>\n      </Grid>\n    );\n  };\n  \n  return (\n    <DashboardContainer>\n      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>\n        <Typography variant=\"h4\" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>\n          <Analytics />\n          AI Monitoring Dashboard\n        </Typography>\n        \n        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>\n          <FormControlLabel\n            control={\n              <Switch\n                checked={autoRefresh}\n                onChange={(e) => setAutoRefresh(e.target.checked)}\n                sx={{\n                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#00ffff' },\n                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { \n                    backgroundColor: '#00ffff' \n                  }\n                }}\n              />\n            }\n            label={\n              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>\n                Auto-refresh\n              </Typography>\n            }\n          />\n          \n          <Tooltip title=\"Refresh Data\">\n            <IconButton onClick={handleRefresh} disabled={isLoading}>\n              <Refresh sx={{ color: isLoading ? 'rgba(255, 255, 255, 0.3)' : '#00ffff' }} />\n            </IconButton>\n          </Tooltip>\n          \n          {user.role === 'admin' && (\n            <Button\n              variant=\"outlined\"\n              onClick={resetMetrics}\n              sx={{ borderColor: '#ff6b9d', color: '#ff6b9d' }}\n              size=\"small\"\n            >\n              Reset Metrics\n            </Button>\n          )}\n        </Box>\n      </Box>\n      \n      {/* Loading State */}\n      {isLoading && (\n        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>\n          <CircularProgress sx={{ color: '#00ffff' }} />\n        </Box>\n      )}\n      \n      {/* Main Content */}\n      {!isLoading && (\n        <motion.div\n          initial={{ opacity: 0, y: 20 }}\n          animate={{ opacity: 1, y: 0 }}\n          transition={{ duration: 0.5 }}\n        >\n          <Tabs\n            value={activeTab}\n            onChange={(e, newValue) => setActiveTab(newValue)}\n            sx={{\n              mb: 3,\n              '& .MuiTab-root': { color: 'rgba(255, 255, 255, 0.7)' },\n              '& .MuiTab-root.Mui-selected': { color: '#00ffff' },\n              '& .MuiTabs-indicator': { backgroundColor: '#00ffff' }\n            }}\n          >\n            <Tab label=\"Overview\" />\n            <Tab label=\"Performance\" />\n            <Tab label=\"Trends\" />\n            <Tab label=\"Health\" />\n          </Tabs>\n          \n          {activeTab === 0 && renderOverview()}\n          {activeTab === 1 && renderPerformanceTable()}\n          {activeTab === 2 && renderTrends()}\n          {activeTab === 3 && renderHealth()}\n        </motion.div>\n      )}\n      \n      {/* Error State */}\n      {!isLoading && !metrics && !health && (\n        <Box sx={{ textAlign: 'center', py: 8 }}>\n          <Analytics sx={{ fontSize: '4rem', color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />\n          <Typography variant=\"h6\" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>\n            Unable to load monitoring data\n          </Typography>\n          <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>\n            Please check your connection and try again\n          </Typography>\n        </Box>\n      )}\n    </DashboardContainer>\n  );\n};\n\nexport default AIDashboard;