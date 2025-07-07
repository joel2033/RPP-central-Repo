import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Bot, MapPin, Video } from "lucide-react";

export default function ServicesOverview() {
  const services = [
    {
      name: "Photography",
      icon: Camera,
      count: 0,
      color: "bg-blue-100 text-blue-600",
    },
    {
      name: "Bot",
      icon: Bot,
      count: 0,
      color: "bg-green-100 text-green-600",
    },
    {
      name: "Floor Plans",
      icon: MapPin,
      count: 0,
      color: "bg-purple-100 text-purple-600",
    },
    {
      name: "Video",
      icon: Video,
      count: 0,
      color: "bg-red-100 text-red-600",
    },
  ];

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Services Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.name} className="text-center">
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4 ${service.color}`}>
                  <Icon className="h-8 w-8" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2">{service.name}</h4>
                <p className="text-2xl font-bold text-slate-900">{service.count}</p>
                <p className="text-xs text-slate-500">jobs this month</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
