import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/context/ToastContext";
import { reports, properties } from "@/data/mockData";

export default function DetailedReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [report, setReport] = useState(null);

  useEffect(() => {
    const foundReport = reports.find((r) => r.id === parseInt(id));
    if (!foundReport) {
      addToast({ title: "Error", description: "Report not found." });
      navigate("/reports");
    } else {
      setReport(foundReport);
    }
  }, [id, addToast, navigate]);

  if (!report) return null;

  const property = properties.find((prop) => prop.id === report.propertyId);

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate("/reports")}>
        Back to Reports
      </Button>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{property?.name || "Unknown Property"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div>
              <p>Date: {format(parseISO(report.date), "MMM d, yyyy")}</p>
              <p>Guard: {report.guardName}</p>
              <p>Status: <Badge>{report.status}</Badge></p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="activities" className="mt-4">
        <TabsList>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {report.activities?.map((activity, index) => (
                <p key={index}>
                  {activity.time}: {activity.description}
                </p>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{report.guardNotes || "No notes available."}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
