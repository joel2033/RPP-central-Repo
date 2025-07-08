import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";

const OrderStatus = memo(() => {
  // Mock data for demonstration
  const orders = [
    {
      id: 1,
      jobId: "JOB-001",
      property: "123 Main St",
      client: "John Doe",
      status: "in_progress",
      editor: "Sarah Wilson",
      createdAt: "2024-01-15",
      dueDate: "2024-01-17",
      services: ["Photography", "Floor Plans"]
    },
    {
      id: 2,
      jobId: "JOB-002", 
      property: "456 Oak Ave",
      client: "Jane Smith",
      status: "ready_for_qa",
      editor: "Mike Johnson",
      createdAt: "2024-01-14",
      dueDate: "2024-01-16",
      services: ["Photography", "Drone"]
    },
    {
      id: 3,
      jobId: "JOB-003",
      property: "789 Pine Rd",
      client: "Bob Wilson",
      status: "delivered",
      editor: "Lisa Brown",
      createdAt: "2024-01-13",
      dueDate: "2024-01-15",
      services: ["Photography", "Video"]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "ready_for_qa":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      in_progress: "bg-blue-100 text-blue-800",
      ready_for_qa: "bg-yellow-100 text-yellow-800", 
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };

    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants]}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Order Status</h1>
        <p className="text-gray-600">Track the progress of all orders in production</p>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(order.status)}
                  <div>
                    <CardTitle className="text-lg">{order.jobId}</CardTitle>
                    <CardDescription>{order.property}</CardDescription>
                  </div>
                </div>
                {getStatusBadge(order.status)}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-1">Client</h4>
                  <p className="text-sm text-gray-600">{order.client}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-1">Editor</h4>
                  <p className="text-sm text-gray-600">{order.editor}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-1">Due Date</h4>
                  <p className="text-sm text-gray-600">{order.dueDate}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Services</h4>
                <div className="flex flex-wrap gap-2">
                  {order.services.map((service) => (
                    <Badge key={service} variant="outline" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

OrderStatus.displayName = "OrderStatus";

export default OrderStatus;