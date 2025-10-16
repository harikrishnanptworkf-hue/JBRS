<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;
use App\Models\Schedule;

class ClientCreated implements ShouldBroadcast
{
    use InteractsWithSockets, SerializesModels;

    public $schedule;

    public function __construct(Schedule $schedule)
    {
        $this->schedule = $schedule;
    }

    public function broadcastOn()
    {
        return new Channel('clientcreate');
    }

    public function broadcastAs()
    {
        return 'ClientCreated';
    }

    public function broadcastWith()
    {
        return [
            'schedule' => $this->schedule
        ];
    }
}