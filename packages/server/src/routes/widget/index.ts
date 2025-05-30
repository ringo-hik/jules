import { Router } from 'express'
import widgetController from '../../controllers/widget'
import { asyncHandler } from '../../middlewares/asyncHandler'
// Assuming predictionsController.getRateLimiterMiddleware is the one to use,
// or if widget needs its own rate limiting, it would be defined elsewhere.
import predictionsController from '../../controllers/predictions'

const router = Router()

// Route to handle incoming chat messages from the widget
// The path is /:id/stream, and it will be mounted under /widget,
// making the full path /api/v1/widget/:id/stream
router.post(
    '/:id/stream',
    asyncHandler(predictionsController.getRateLimiterMiddleware), // Apply rate limiting
    asyncHandler(widgetController.createWidgetPrediction) // Handle the prediction
)

export default router
