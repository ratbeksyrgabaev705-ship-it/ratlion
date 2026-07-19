package kg.restaurant.order.controller;

import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.servlet.http.HttpServletRequest;

/**
 * /restaurant/{slug} маршруту compile болмой турган учурда
 * kitchen панeline redirect кылат.
 */
@ControllerAdvice
public class NotFoundRedirectAdvice {

    @ExceptionHandler(NoResourceFoundException.class)
    public String redirectRestaurantPanel(
            NoResourceFoundException ex,
            HttpServletRequest request
    ) throws NoResourceFoundException {
        String path = request.getRequestURI();
        if (path != null && path.matches("^/restaurant/[^/]+$")) {
            String slug = path.substring(path.lastIndexOf('/') + 1);
            return "redirect:/kitchen/" + slug;
        }
        throw ex;
    }
}
