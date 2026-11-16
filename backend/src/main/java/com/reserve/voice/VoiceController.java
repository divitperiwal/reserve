package com.reserve.voice;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import org.springframework.web.bind.annotation.PostMapping;
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

    // The body is read only after the secret checks out, and capped
    @PostMapping("/lookup")
    public VoiceRequests.LookupResult lookup(@RequestHeader(value = "X-Voice-Secret", required = false) String secret,
                                             HttpServletRequest request) throws IOException {
        voice.checkSecret(secret);
        return voice.lookup(voice.read(voice.body(request.getInputStream()), VoiceRequests.Lookup.class));
    }

    @PostMapping("/donations")
    public VoiceRequests.Posted donate(@RequestHeader(value = "X-Voice-Secret", required = false) String secret,
                                       HttpServletRequest request) throws IOException {
        voice.checkSecret(secret);
        return voice.post(voice.read(voice.body(request.getInputStream()), VoiceRequests.Donation.class));
    }
}
