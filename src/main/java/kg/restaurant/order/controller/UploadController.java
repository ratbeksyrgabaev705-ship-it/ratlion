package kg.restaurant.order.controller;

import kg.restaurant.order.model.CustomerOrder;
import kg.restaurant.order.repository.CustomerOrderRepository;
import kg.restaurant.order.service.ReceiptStorageService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
public class UploadController {

    private final CustomerOrderRepository repository;
    private final ReceiptStorageService receiptStorageService;

    public UploadController(
            CustomerOrderRepository repository,
            ReceiptStorageService receiptStorageService
    ) {
        this.repository = repository;
        this.receiptStorageService = receiptStorageService;
    }

    @PostMapping("/orders/{id}/upload")
    public CustomerOrder uploadReceipt(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file
    ) throws IOException {

        CustomerOrder order = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Заказ табылган жок"));

        String receiptPath = receiptStorageService.saveReceipt(file);
        order.setReceiptImagePath(receiptPath);
        return repository.save(order);
    }

    @GetMapping("/uploads/{fileName:.+}")
    public ResponseEntity<Resource> getReceiptFile(@PathVariable String fileName) throws IOException {
        Path uploadFolder = receiptStorageService.getUploadFolder();
        Path filePath = uploadFolder.resolve(fileName).normalize();
        return buildFileResponse(uploadFolder, filePath);
    }

    @GetMapping("/uploads/menu/{fileName:.+}")
    public ResponseEntity<Resource> getMenuImage(@PathVariable String fileName) throws IOException {
        Path menuUploadFolder = receiptStorageService.getMenuUploadFolder();
        Path filePath = menuUploadFolder.resolve(fileName).normalize();
        return buildFileResponse(menuUploadFolder, filePath);
    }

    private ResponseEntity<Resource> buildFileResponse(Path allowedFolder, Path filePath) throws IOException {
        if (!filePath.startsWith(allowedFolder)) {
            return ResponseEntity.badRequest().build();
        }
        if (!Files.exists(filePath) || !Files.isRegularFile(filePath)) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new FileSystemResource(filePath);
        String contentType = Files.probeContentType(filePath);
        MediaType mediaType;
        try {
            mediaType = contentType == null
                    ? MediaType.APPLICATION_OCTET_STREAM
                    : MediaType.parseMediaType(contentType);
        } catch (Exception ignored) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok().contentType(mediaType).body(resource);
    }
}
