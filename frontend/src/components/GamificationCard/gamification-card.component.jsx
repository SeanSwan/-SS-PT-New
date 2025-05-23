import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Award, CheckCircle } from 'lucide-react'

export default function GamificationCard({ currentLevel, currentPoints }) {
  const nextLevelPoints = 1000
  const progressPercentage = (currentPoints / nextLevelPoints) * 100
  const badges = [
    { icon: Award, label: 'Punctual Protector' },
    { icon: CheckCircle, label: 'Patrol Pro' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gamification</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <Avatar className="w-20 h-20 mx-auto mb-4">
            <AvatarImage src="/owl-avatar.png" alt="Guard Avatar" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <h3 className="text-xl font-bold mb-2">Level {currentLevel}</h3>
          <p className="text-sm text-gray-500 mb-4">{currentPoints} / {nextLevelPoints} XP</p>
          <Progress value={progressPercentage} className="mb-4" />
          <div className="flex justify-center space-x-2">
            {badges.map((badge, index) => (
              <Badge key={index} variant="secondary">
                <badge.icon className="w-4 h-4 mr-1" />
                {badge.label}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}