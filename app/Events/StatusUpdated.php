<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class StatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $id;
    public $status;
    public $system_name;
    public $access_code;
    public $done_by;

    public function __construct($id, $status, $system_name, $access_code, $done_by)
    {
        $this->id = $id;
        $this->status = $status;
        $this->system_name = $system_name;
        $this->access_code = $access_code;
        $this->done_by = $done_by;
    }

    public function broadcastOn()
    {
        Log::info('StatusUpdated broadcastOn called', [
            'id' => $this->id,
            'status' => $this->status,
            'system_name' => $this->system_name,
            'access_code' => $this->access_code,
            'done_by' => $this->done_by
        ]);
        return new Channel('schedulechange');
    }

    public function broadcastAs()
    {
        return 'StatusUpdated';
    }

    public function broadcastWith()
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'system_name' => $this->system_name,
            'access_code' => $this->access_code,
            'done_by' => $this->done_by,
        ];
    }
}
