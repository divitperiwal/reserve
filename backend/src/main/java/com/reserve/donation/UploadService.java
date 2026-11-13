package com.reserve.donation;

import com.reserve.common.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UploadService {

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp");
    private static final Map<String, MediaType> TYPES = Map.of(
            "jpg", MediaType.IMAGE_JPEG, "png", MediaType.IMAGE_PNG, "webp", MediaType.parseMediaType("image/webp"));

    private final Path dir;

    public UploadService(@Value("${app.upload-dir}") String dir) {
        this.dir = Path.of(dir).toAbsolutePath().normalize();
    }

    public String store(MultipartFile file) throws IOException {
        String ext = file.getContentType() == null ? null : EXTENSIONS.get(file.getContentType().toLowerCase());
        if (ext == null || file.isEmpty()) {
            throw ApiException.badRequest("Use a JPG, PNG or WEBP photo", Map.of("file", "Use a JPG, PNG or WEBP photo"));
        }
        Files.createDirectories(dir);
        String name = UUID.randomUUID() + "." + ext;
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, dir.resolve(name));
        }
        return "/api/uploads/" + name;
    }

    // Only names this service generated are served, which also rules out path traversal
    public Resource load(String name) {
        if (!name.matches("[0-9a-f-]{36}\\.(jpg|png|webp)") || !Files.isRegularFile(dir.resolve(name))) {
            throw ApiException.notFound("Photo not found");
        }
        return new FileSystemResource(dir.resolve(name));
    }

    public MediaType typeOf(String name) {
        return TYPES.get(name.substring(name.lastIndexOf('.') + 1));
    }
}
