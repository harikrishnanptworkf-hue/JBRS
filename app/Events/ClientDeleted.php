<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;
use App\Models\Schedule;

class ClientDeleted implements ShouldBroadcast
{
    use InteractsWithSockets, SerializesModels;

    public $schedule;

    public function __construct()
    {
        
    }

    public function broadcastOn()
    {
        return new Channel('clientdelete');
    }

    public function broadcastAs()
    {
        return 'ClientDeleted';
    }

}