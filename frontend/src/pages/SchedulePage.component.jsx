import React, { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Plus,
  Send,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Mock data for regions, managers, properties, and guards
const regions = [
  { id: 'r1', name: 'Orange County' },
  { id: 'r2', name: 'Los Angeles' },
  { id: 'r3', name: 'San Diego' },
  { id: 'r4', name: 'Northern California' },
]

const managers = [
  { id: 'm1', name: 'Oliver', regionId: 'r1' },
  { id: 'm2', name: 'Rafael', regionId: 'r2' },
  { id: 'm3', name: 'Paul', regionId: 'r3' },
  { id: 'm4', name: 'Kevin', regionId: 'r4' },
]

const properties = [
  { id: 'prop1', name: 'Sonesta Redondo Beach', regionId: 'r1' },
  { id: 'prop2', name: 'Llewellyn', regionId: 'r1' },
  { id: 'prop3', name: 'Tustin Plaza', regionId: 'r1' },
  { id: 'prop4', name: 'Elinor', regionId: 'r2' },
  { id: 'prop5', name: 'Arq', regionId: 'r2' },
  { id: 'prop6', name: 'The Alfred', regionId: 'r3' },
  { id: 'prop7', name: 'The Remi San Bernardino', regionId: 'r3' },
  { id: 'prop8', name: 'Westhaven', regionId: 'r2' },
  { id: 'prop9', name: 'Villa Park', regionId: 'r2' },
  { id: 'prop10', name: 'Ami-On Olive', regionId: 'r2' },
  { id: 'prop11', name: 'Remi Living at Noho', regionId: 'r3' },
  { id: 'prop12', name: 'Sonesta R/B Modera', regionId: 'r1' },
  { id: 'prop13', name: 'Circa', regionId: 'r3' },
  { id: 'prop14', name: 'Kurve', regionId: 'r3' },
  { id: 'prop15', name: 'San Bernardino', regionId: 'r3' },
  { id: 'prop16', name: 'Wakaba', regionId: 'r3' },
  { id: 'prop17', name: 'Sunset', regionId: 'r4' },
  { id: 'prop18', name: 'Opus', regionId: 'r4' },
  { id: 'prop19', name: 'Emerald', regionId: 'r4' },
  { id: 'prop20', name: 'Onyx DTLA', regionId: 'r4' },
  { id: 'prop21', name: 'Topaz', regionId: 'r4' },
  { id: 'prop22', name: 'The Remi M-F Bell South', regionId: 'r3' },
  { id: 'prop23', name: 'Zen Hollywood', regionId: 'r2' },
  { id: 'prop24', name: 'Solamotion', regionId: 'r2' },
  { id: 'prop25', name: 'Mirador Apt', regionId: 'r3' },
  { id: 'prop26', name: 'Watermark', regionId: 'r4' },
  { id: 'prop27', name: 'La Plaza', regionId: 'r3' },
  { id: 'prop28', name: 'Westbury', regionId: 'r4' },
  { id: 'prop29', name: 'Access', regionId: 'r2' },
  { id: 'prop30', name: 'CC Tan', regionId: 'r2' },
];

const guards = [
  {
    id: 'guard1',
    name: 'John Doe',
    phone: '(555) 123-4567',
    email: 'john.doe@example.com',
    avatar: '/placeholder.svg?height=40&width=40',
    regionId: 'r1',
  },
  {
    id: 'guard2',
    name: 'Jane Smith',
    phone: '(555) 987-6543',
    email: 'jane.smith@example.com',
    avatar: '/placeholder.svg?height=40&width=40',
    regionId: 'r2',
  },
  {
    id: 'guard3',
    name: 'Mike Johnson',
    phone: '(555) 246-8135',
    email: 'mike.johnson@example.com',
    avatar: '/placeholder.svg?height=40&width=40',
    regionId: 'r3',
  },
  {
    id: 'guard4',
    name: 'Emily Davis',
    phone: '(555) 369-2580',
    email: 'emily.davis@example.com',
    avatar: '/placeholder.svg?height=40&width=40',
    regionId: 'r4',
  },
]

// Mock schedule data
const initialSchedule = [
  {
    id: 1,
    propertyId: 'prop1',
    guardId: 'guard1',
    date: '2023-06-01',
    startTime: '08:00',
    endTime: '16:00',
    calledOff: false,
  },
  {
    id: 2,
    propertyId: 'prop2',
    guardId: 'guard2',
    date: '2023-06-01',
    startTime: '09:00',
    endTime: '17:00',
    calledOff: false,
  },
  {
    id: 3,
    propertyId: 'prop3',
    guardId: 'guard3',
    date: '2023-06-02',
    startTime: '10:00',
    endTime: '18:00',
    calledOff: true,
  },
  {
    id: 4,
    propertyId: 'prop4',
    guardId: 'guard4',
    date: '2023-06-02',
    startTime: '07:00',
    endTime: '15:00',
    calledOff: false,
  },
]

export default function EnhancedMonthlySchedulePage() {
  const [selectedRegion, setSelectedRegion] = useState(regions[0].id)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [schedule, setSchedule] = useState(initialSchedule)
  const [alerts, setAlerts] = useState([])
  const [newAlert, setNewAlert] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())

  const filteredProperties = useMemo(
    () => properties.filter((prop) => prop.regionId === selectedRegion),
    [selectedRegion]
  )
  const filteredGuards = useMemo(
    () => guards.filter((guard) => guard.regionId === selectedRegion),
    [selectedRegion]
  )
  const currentManager = useMemo(
    () => managers.find((manager) => manager.regionId === selectedRegion),
    [selectedRegion]
  )

  const addShift = (date) => {
    const newShift = {
      id: Date.now(),
      propertyId: selectedProperty,
      guardId: '',
      date: date.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      calledOff: false,
    }
    setSchedule((prevSchedule) => [...prevSchedule, newShift])
  }

  const removeShift = (shiftId) => {
    setSchedule((prevSchedule) =>
      prevSchedule.filter((shift) => shift.id !== shiftId)
    )
  }

  const updateShift = (shiftId, field, value) => {
    setSchedule((prevSchedule) =>
      prevSchedule.map((shift) =>
        shift.id === shiftId ? { ...shift, [field]: value } : shift
      )
    )
  }

  const toggleCallOff = (shiftId) => {
    setSchedule((prevSchedule) =>
      prevSchedule.map((shift) =>
        shift.id === shiftId ? { ...shift, calledOff: !shift.calledOff } : shift
      )
    )
  }

  const handleDragStart = (e, shiftId) => {
    e.dataTransfer.setData('text/plain', shiftId)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e, date) => {
    e.preventDefault()
    const shiftId = e.dataTransfer.getData('text/plain')
    const shiftIdNumber = parseInt(shiftId)
    setSchedule((prevSchedule) =>
      prevSchedule.map((shift) =>
        shift.id === shiftIdNumber
          ? { ...shift, date: date.toISOString().split('T')[0] }
          : shift
      )
    )
  }

  const sendAlert = () => {
    if (newAlert.trim()) {
      setAlerts((prevAlerts) => [
        ...prevAlerts,
        { id: Date.now(), message: newAlert, sender: currentManager.name },
      ])
      setNewAlert('')
    }
  }

  const filteredSchedule = useMemo(
    () => schedule.filter((shift) => shift.propertyId === selectedProperty),
    [schedule, selectedProperty]
  )

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getMonthData = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const monthData = []

    for (let i = 0; i < firstDayOfMonth; i++) {
      monthData.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      monthData.push(new Date(year, month, day))
    }

    return monthData
  }

  const monthData = useMemo(getMonthData, [currentDate])

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const date = new Date(2023, 0, 1, hours, minutes)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Monthly Security Schedule</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Region and Property Selection</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Select
            value={selectedRegion}
            onValueChange={(value) => {
              setSelectedRegion(value)
              setSelectedProperty(null) // Reset selected property when region changes
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {filteredProperties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-gray-500" />
            <span className="font-medium">
              Manager: {currentManager?.name || 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>

      {selectedProperty && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Monthly Schedule</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCurrentDate(
                      new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth() - 1,
                        1
                      )
                    )
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">
                  {currentDate.toLocaleString('default', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCurrentDate(
                      new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth() + 1,
                        1
                      )
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center font-medium p-2 bg-gray-100"
                >
                  {day}
                </div>
              ))}
              {monthData.map((date, index) => (
                <div
                  key={index}
                  onDragOver={handleDragOver}
                  onDrop={(e) => date && handleDrop(e, date)}
                  className={`min-h-[120px] p-1 border ${
                    date ? 'bg-white' : 'bg-gray-100'
                  }`}
                >
                  {date && (
                    <>
                      <div className="text-right text-sm text-gray-500">
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {filteredSchedule
                          .filter(
                            (shift) =>
                              shift.date === date.toISOString().split('T')[0]
                          )
                          .sort((a, b) =>
                            a.startTime.localeCompare(b.startTime)
                          )
                          .map((shift) => (
                            <div
                              key={shift.id}
                              draggable="true"
                              onDragStart={(e) => handleDragStart(e, shift.id)}
                              className={`bg-blue-200 p-1 rounded text-xs flex items-center justify-between ${
                                shift.calledOff ? 'ring-2 ring-red-500' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Avatar className="h-4 w-4">
                                        <AvatarImage
                                          src={
                                            filteredGuards.find(
                                              (g) => g.id === shift.guardId
                                            )?.avatar
                                          }
                                        />
                                        <AvatarFallback>
                                          {filteredGuards
                                            .find(
                                              (g) => g.id === shift.guardId
                                            )
                                            ?.name.charAt(0) || 'G'}
                                        </AvatarFallback>
                                      </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {filteredGuards.find(
                                          (g) => g.id === shift.guardId
                                        )?.name || 'Unassigned'}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <span>
                                  {formatTime(shift.startTime)} -{' '}
                                  {formatTime(shift.endTime)}
                                </span>
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0"
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-2">
                                    <h4 className="font-semibold">
                                      {filteredGuards.find(
                                        (g) => g.id === shift.guardId
                                      )?.name || 'Unassigned'}
                                    </h4>
                                    <div className="flex items-center space-x-2">
                                      <Clock className="h-4 w-4" />
                                      <span>
                                        {shift.startTime} - {shift.endTime}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <ChevronRight className="h-4 w-4" />
                                      <span>
                                        {
                                          filteredProperties.find(
                                            (p) => p.id === selectedProperty
                                          )?.name
                                        }
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <label
                                          htmlFor={`start-time-${shift.id}`}
                                          className="text-sm font-medium"
                                        >
                                          Start Time:
                                        </label>
                                        <Input
                                          id={`start-time-${shift.id}`}
                                          type="time"
                                          value={shift.startTime}
                                          onChange={(e) =>
                                            updateShift(
                                              shift.id,
                                              'startTime',
                                              e.target.value
                                            )
                                          }
                                          className="w-24"
                                        />
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <label
                                          htmlFor={`end-time-${shift.id}`}
                                          className="text-sm font-medium"
                                        >
                                          End Time:
                                        </label>
                                        <Input
                                          id={`end-time-${shift.id}`}
                                          type="time"
                                          value={shift.endTime}
                                          onChange={(e) =>
                                            updateShift(
                                              shift.id,
                                              'endTime',
                                              e.target.value
                                            )
                                          }
                                          className="w-24"
                                        />
                                      </div>
                                    </div>
                                    <Select
                                      value={shift.guardId}
                                      onValueChange={(value) =>
                                        updateShift(
                                          shift.id,
                                          'guardId',
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select guard" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {filteredGuards.map((guard) => (
                                          <SelectItem
                                            key={guard.id}
                                            value={guard.id}
                                          >
                                            {guard.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="flex justify-between">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          toggleCallOff(shift.id)
                                        }
                                      >
                                        {shift.calledOff
                                          ? 'Remove Call-Off'
                                          : 'Mark as Called-Off'}
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeShift(shift.id)}
                                      >
                                        Remove Shift
                                      </Button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-1"
                        onClick={() => addShift(date)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-40 overflow-y-auto border rounded p-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="mb-2 p-2 bg-gray-100 rounded">
                  <p className="text-sm font-medium">{alert.sender}</p>
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <Textarea
                placeholder="Type your alert here..."
                value={newAlert}
                onChange={(e) => setNewAlert(e.target.value)}
                className="flex-grow"
              />
              <Button onClick={sendAlert}>
                <Send className="h-4 w-4 mr-2" />
                Send Alert
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}