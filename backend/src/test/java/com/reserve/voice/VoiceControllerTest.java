package com.reserve.voice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reserve.common.ApiException;
import com.reserve.donation.DonationService;
import com.reserve.user.UserRepository;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Validation;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class VoiceControllerTest {

    private static VoiceController controller(String secret) {
        return new VoiceController(new VoiceService(secret, "Asia/Kolkata", mock(UserRepository.class), mock(DonationService.class),
                Validation.buildDefaultValidatorFactory().getValidator(), new ObjectMapper()));
    }

    private static HttpServletRequest requestOf(byte[] body) throws IOException {
        HttpServletRequest request = mock(HttpServletRequest.class);
        ByteArrayInputStream in = new ByteArrayInputStream(body);
        when(request.getInputStream()).thenReturn(new ServletInputStream() {
            public int read() {
                return in.read();
            }

            public int read(byte[] b, int off, int len) {
                return in.read(b, off, len);
            }

            public boolean isFinished() {
                return in.available() == 0;
            }

            public boolean isReady() {
                return true;
            }

            public void setReadListener(jakarta.servlet.ReadListener listener) {
            }
        });
        return request;
    }

    @Test
    void bodyIsNeverReadWhenTheHotlineIsOffOrTheSecretIsWrong() throws IOException {
        HttpServletRequest off = mock(HttpServletRequest.class);
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ApiException.class, () -> controller("").lookup("x", off)).status());
        verify(off, never()).getInputStream();

        HttpServletRequest wrong = mock(HttpServletRequest.class);
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class, () -> controller("s3cret").donate("nope", wrong)).status());
        verify(wrong, never()).getInputStream();
    }

    @Test
    void oversizedBodyIsRejectedWith413() throws IOException {
        byte[] big = new byte[VoiceService.MAX_BODY + 1];
        Arrays.fill(big, (byte) 'a');

        ApiException e = assertThrows(ApiException.class, () -> controller("s3cret").lookup("s3cret", requestOf(big)));

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, e.status());
    }

    @Test
    void bodyAtTheCapIsStillRead() throws IOException {
        byte[] ok = ("{\"phone\":\"1\"}" + " ".repeat(VoiceService.MAX_BODY - 13)).getBytes(StandardCharsets.UTF_8);

        assertEquals(false, controller("s3cret").lookup("s3cret", requestOf(ok)).registered());
    }
}
