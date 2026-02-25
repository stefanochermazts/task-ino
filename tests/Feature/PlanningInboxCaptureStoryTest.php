<?php

namespace Tests\Feature;

use Tests\TestCase;

class PlanningInboxCaptureStoryTest extends TestCase
{
    public function test_root_page_exposes_quick_capture_and_inbox_shell(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $response->assertSee('Today-first planning');
        $response->assertSee('Quick capture');
        $response->assertSee('Inbox');
        $response->assertSee('planning-app');
    }

    public function test_root_page_exposes_non_blocking_network_status_area(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $response->assertSee('Connection status');
        $response->assertSee('sync remains optional and non-blocking');
    }

    public function test_root_page_exposes_today_projection_shell(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $response->assertSee('Today');
        $response->assertSee('Cap 3');
        $response->assertSee('Today is empty');
    }
}
