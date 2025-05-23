import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"


export default function CommunicationCard() {
  const [selectedGroup, setSelectedGroup] = useState('Property A')
  const groups = ['Property A', 'Property B', 'Property C']

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Communication</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <label htmlFor="group-select" className="block text-sm font-medium text-gray-700">Select Group:</label>
          <select
            id="group-select"
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {groups.map((group, index) => (
              <option key={index} value={group}>{group}</option>
            ))}
          </select>
        </div>
        {/* <ChatBot group={selectedGroup} /> */}
      </CardContent>
    </Card>
  )
}