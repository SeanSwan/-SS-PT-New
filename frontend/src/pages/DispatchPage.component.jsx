import React, { useState } from 'react'
import { Bell, Settings, HelpCircle, LogOut, MapPin, Users, AlertTriangle, CheckCircle, Mic, MicOff, Send, Menu, Building, UserPlus, Calendar, FileText, Camera } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const MapPlaceholder = () => (
  <div className="w-full h-40 bg-gray-200 rounded-lg flex items-center justify-center">
    <MapPin className="w-8 h-8 text-gray-400" />
    <span className="ml-2 text-gray-600">Interactive Map</span>
  </div>
)

export default function EnhancedChatDashboard() {
  const [isVoiceToTextActive, setIsVoiceToTextActive] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState('all')

  const toggleVoiceToText = () => {
    setIsVoiceToTextActive(!isVoiceToTextActive)
    // Here you would implement the actual voice-to-text functionality
  }

  const properties = [
    { id: 'prop1', name: 'Downtown Office', guards: ['John Doe', 'Jane Smith'] },
    { id: 'prop2', name: 'Westside Mall', guards: ['Mike Johnson', 'Emily Brown'] },
    { id: 'prop3', name: 'Harbor Warehouse', guards: ['Chris Lee', 'Sarah Wilson'] },
  ]

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center">
            <img src="/placeholder.svg?height=40&width=40" alt="Owl Mascot" className="h-8 w-8 mr-2" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dispatch Security</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
        <nav className="mt-4">
          <Button variant="ghost" className="w-full justify-start">
            <Users className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Building className="mr-2 h-4 w-4" />
            Properties
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <MapPin className="mr-2 h-4 w-4" />
            Patrols
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Incidents
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Calendar className="mr-2 h-4 w-4" />
            Schedules
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <FileText className="mr-2 h-4 w-4" />
            Reports
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="lg:hidden">
                <Menu className="h-6 w-6" />
              </Button>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security Command Center</h2>
              <div className="flex items-center space-x-4">
                <Bell className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer" />
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                  <AvatarFallback>UN</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Chat Interface */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Dispatch Chat</CardTitle>
                    <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Property" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Properties</SelectItem>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-400px)] mb-4">
                    {/* Chat messages would go here */}
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <Avatar className="mr-2">
                          <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Bot" />
                          <AvatarFallback>BOT</AvatarFallback>
                        </Avatar>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm">Welcome to Dispatch Security Chat. How can I assist you today?</p>
                        </div>
                      </div>
                      <div className="flex items-start justify-end">
                        <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm">I need to report an incident at the Downtown Office main entrance.</p>
                        </div>
                        <Avatar className="ml-2">
                          <AvatarImage src="/placeholder.svg?height=40&width=40" alt="User" />
                          <AvatarFallback>UN</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </ScrollArea>
                  <div className="flex items-center space-x-2">
                    <Input placeholder="Type your message..." className="flex-1" />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={toggleVoiceToText}>
                            {isVoiceToTextActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isVoiceToTextActive ? 'Disable' : 'Enable'} voice-to-text</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button size="icon">
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Dashboard Summary */}
              <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">12</div>
                        <div className="text-sm text-gray-500">Active Guards</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">28</div>
                        <div className="text-sm text-gray-500">Check-ins</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">2</div>
                        <div className="text-sm text-gray-500">Incidents</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">24</div>
                        <div className="text-sm text-gray-500">Patrol Points</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Guard Locations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MapPlaceholder />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Property Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="prop1">
                      <TabsList className="grid w-full grid-cols-3">
                        {properties.map((property) => (
                          <TabsTrigger key={property.id} value={property.id}>{property.name}</TabsTrigger>
                        ))}
                      </TabsList>
                      {properties.map((property) => (
                        <TabsContent key={property.id} value={property.id}>
                          <h4 className="font-semibold mb-2">Guards on Duty:</h4>
                          <ul className="list-disc list-inside">
                            {property.guards.map((guard, index) => (
                              <li key={index}>{guard}</li>
                            ))}
                          </ul>
                          <Button className="mt-4" variant="outline">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Assign Guard
                          </Button>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-center text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <span>John Doe checked in at Downtown Office</span>
                        <span className="ml-auto text-xs text-gray-500">2m ago</span>
                      </li>
                      <li className="flex items-center text-sm">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                        <span>Incident reported at Westside Mall parking lot</span>
                        <span className="ml-auto text-xs text-gray-500">15m ago</span>
                      </li>
                      <li className="flex items-center text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <span>Sarah Wilson completed patrol at Harbor Warehouse</span>
                        <span className="ml-auto text-xs text-gray-500">1h ago</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}