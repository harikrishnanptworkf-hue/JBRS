<?php

namespace App\Events;

use App\Models\Schedule;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ScheduleCreated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public $schedule;
    public function __construct(Schedule $schedule)
    {
        //
        $this->schedule = $schedule;
    }

    public function broadcastOn()
    {
        return new Channel('schedules');
    }

    public function broadcastAs()
    {
        return 'ScheduleCreated';
    }
}
