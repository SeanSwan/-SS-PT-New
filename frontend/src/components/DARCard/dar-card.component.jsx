'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import DARForm from '../DARForm/dar-form.component.jsx';

export default function DARCard() {
  // This data can be fetched from backend or context
  const submissionHistory = [
    { date: '2023-09-24', status: 'Submitted' },
    { date: '2023-09-23', status: 'Submitted' },
    { date: '2023-09-22', status: 'Submitted' },
  ];

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Daily Activity Reports (DAR)</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">Submission History</TabsTrigger>
            <TabsTrigger value="new">New Submission</TabsTrigger>
          </TabsList>
          <TabsContent value="history">
            <ul className="space-y-2">
              {submissionHistory.map((submission, index) => (
                <li key={index} className="flex justify-between items-center">
                  <span>DAR - {submission.date}</span>
                  <Badge>{submission.status}</Badge>
                </li>
              ))}
            </ul>
          </TabsContent>
          <TabsContent value="new">
            <DARForm />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}