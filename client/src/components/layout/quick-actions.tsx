import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, UserPlus, CalendarPlus } from "lucide-react";
import BookingModal from "@/components/modals/booking-modal-new";
import ClientModal from "@/components/modals/client-modal";

export default function QuickActions() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="bg-brand-blue hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => setIsBookingModalOpen(true)}
            className="cursor-pointer"
          >
            <CalendarPlus className="h-4 w-4 mr-2" />
            Add New Booking
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsClientModalOpen(true)}
            className="cursor-pointer"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add New Client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        booking={null}
      />

      {/* Client Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        client={null}
      />
    </>
  );
}