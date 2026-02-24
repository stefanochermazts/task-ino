<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ValidateQuickCaptureInputTest extends TestCase
{
    public function test_empty_title_is_rejected(): void
    {
        $path = __DIR__.'/../../resources/js/features/planning/invariants/validateQuickCaptureInput.js';
        $source = file_get_contents($path);

        $this->assertIsString($source);
        $this->assertStringContainsString('Task title is required.', $source);
        $this->assertStringContainsString('trim()', $source);
    }
}
