
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

type GearStatus = {
    id: string;
    name: string;
    category: string;
    status: 'Available' | 'Active' | 'Buffer' | 'Booked' | 'Maintenance';
    currentBooking: {
        memberName: string;
        contact: string;
        startTime: string; // ISO string 
        endTime: string;
        isOverdue: boolean;
    } | null;
    nextBooking: {
        startTime: string;
    } | null;
};

export function LiveGearView() {
    const [gearStatus, setGearStatus] = useState<GearStatus[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        try {
            const res = await fetch("/api/staff/gear-status");
            if (res.ok) {
                const data = await res.json();
                setGearStatus(data);
            }
        } catch (error) {
            console.error("Failed to fetch gear status", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        // Poll every 1 minute
        const interval = setInterval(fetchStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string, isOverdue: boolean) => {
        if (isOverdue) return "destructive";
        switch (status) {
            case 'Available': return "default"; // or green? default is usually black/primary.
            case 'Active': return "secondary"; // or blue
            case 'Buffer': return "outline"; // or orange/yellow
            case 'Booked': return "secondary";
            case 'Maintenance': return "destructive";
            default: return "outline";
        }
    };

    if (loading) return <div>Loading gear status...</div>;

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Live Gear Status</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Asset</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Current User</TableHead>
                            <TableHead>Time Remaining / Buffer</TableHead>
                            <TableHead>Next Up</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {gearStatus.map((item) => (
                            <TableRow key={item.id} className={item.currentBooking?.isOverdue ? "bg-red-50" : ""}>
                                <TableCell className="font-medium">
                                    {item.name}
                                    <div className="text-xs text-muted-foreground">{item.category}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getStatusColor(item.status, item.currentBooking?.isOverdue || false) as any}>
                                        {item.currentBooking?.isOverdue ? "OVERDUE" : item.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {item.currentBooking ? (
                                        <div>
                                            <div>{item.currentBooking.memberName}</div>
                                            <div className="text-xs text-muted-foreground">{item.currentBooking.contact}</div>
                                        </div>
                                    ) : "-"}
                                </TableCell>
                                <TableCell>
                                    {item.currentBooking ? (
                                        <div className="text-sm">
                                            {format(new Date(item.currentBooking.startTime), "h:mm a")} - {format(new Date(item.currentBooking.endTime), "h:mm a")}
                                            {item.status === 'Buffer' && <span className="text-xs text-orange-500 block">(In Buffer)</span>}
                                        </div>
                                    ) : "-"}
                                </TableCell>
                                <TableCell>
                                    {item.nextBooking ? (
                                        format(new Date(item.nextBooking.startTime), "h:mm a")
                                    ) : (
                                        <span className="text-muted-foreground text-xs">None</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
