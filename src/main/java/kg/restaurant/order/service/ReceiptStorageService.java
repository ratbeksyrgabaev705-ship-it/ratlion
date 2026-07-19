package kg.restaurant.order.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class ReceiptStorageService {

    private final Path uploadFolder;
    private final Path menuUploadFolder;

    public ReceiptStorageService(
            @Value("${app.upload-dir:uploads}") String uploadDir
    ) {
        uploadFolder = Paths.get(uploadDir).toAbsolutePath().normalize();
        menuUploadFolder = uploadFolder.resolve("menu").normalize();
    }

    public String saveReceipt(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Чек файлы жок");
        }

        Files.createDirectories(uploadFolder);

        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || originalFileName.isBlank()) {
            originalFileName = "receipt.jpg";
        }

        originalFileName = originalFileName
                .replace("\\", "_")
                .replace("/", "_")
                .replaceAll("[^a-zA-Z0-9._-]", "_");

        String fileName = System.currentTimeMillis() + "_" + originalFileName;
        Path destination = uploadFolder.resolve(fileName).normalize();

        if (!destination.startsWith(uploadFolder)) {
            throw new IllegalArgumentException("Файлдын жолу туура эмес");
        }

        file.transferTo(destination.toFile());
        return "/uploads/" + fileName;
    }

    public Path getUploadFolder() {
        return uploadFolder;
    }

    public Path getMenuUploadFolder() {
        return menuUploadFolder;
    }
}
