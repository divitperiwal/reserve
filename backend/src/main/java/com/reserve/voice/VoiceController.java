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

    @PostMapping("/lookup")
    public VoiceRequests.LookupResult lookup(@RequestHeader(value = "X-Voice-Secret", required = false) String secret,
                                             @RequestBody VoiceRequests.Lookup req) {
        voice.checkSecret(secret);
        return voice.lookup(req.phone());
    }

    @PostMapping("/donations")
    public VoiceRequests.Posted donate(@RequestHeader(value = "X-Voice-Secret", required = false) String secret,
                                       @RequestBody VoiceRequests.Donation req) {
        voice.checkSecret(secret);
        return voice.post(req);
    }
}
