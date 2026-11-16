package com.reserve.voice;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/voice")
public class VoiceController {

    private final VoiceService voice;

    public VoiceController(VoiceService voice) {
        this.voice = voice;
    }

    // Bodies arrive raw so the secret is checked before any JSON is parsed
    @PostMapping("/lookup")
    public VoiceRequests.LookupResult lookup(@RequestHeader(value = "X-Voice-Secret", required = false) String secret,
                                             @RequestBody(required = false) String body) {
        voice.checkSecret(secret);
        return voice.lookup(voice.read(body, VoiceRequests.Lookup.class));
    }

    @PostMapping("/donations")
    public VoiceRequests.Posted donate(@RequestHeader(value = "X-Voice-Secret", required = false) String secret,
                                       @RequestBody(required = false) String body) {
        voice.checkSecret(secret);
        return voice.post(voice.read(body, VoiceRequests.Donation.class));
    }
}
