import { Request, Response, NextFunction } from 'express'
import predictionsController from '../predictions' // Assuming default export

class WidgetController {
    /**
     * @swagger
     * /widget/{id}/stream:
     *   post:
     *     summary: Handle incoming chat messages from the widget
     *     description: Receives a chat message from the widget, processes it, and streams back the prediction.
     *     tags: [Widget]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The ID of the chatflow (workflowId).
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               question:
     *                 type: string
     *                 description: The user's question.
     *               chatId:
     *                 type: string
     *                 description: The user's ID (session ID).
     *               history:
     *                 type: array
     *                 items:
     *                   type: object # Define message structure if known, e.g., { role: 'user' | 'api', content: 'string' }
     *                 description: Optional chat history.
     *               overrideConfig:
     *                 type: object
     *                 description: Optional override configurations.
     *               streaming:
     *                 type: boolean
     *                 description: Whether to stream the response (default: false, but true is expected for widgets).
     *     responses:
     *       200:
     *         description: Successfully started streaming the prediction or returned a JSON response.
     *         content:
     *           text/event-stream:
     *             schema:
     *               type: string
     *               description: Server-Sent Events stream.
     *           application/json:
     *             schema:
     *               # Define your JSON response structure here if not streaming
     *               type: object
     *       403:
     *         description: Forbidden if the origin is not allowed.
     *       404:
     *         description: Chatflow not found.
     *       500:
     *         description: Internal server error.
     */
    async createWidgetPrediction(req: Request, res: Response, next: NextFunction) {
        // The workflowId is in req.params.id
        // The request body from the widget is expected to contain:
        // - question: string
        // - chatId: string (this is the user_id from the widget's perspective)
        // - streaming: boolean (optional, true if SSE is desired)
        // - history: array (optional)
        // - overrideConfig: object (optional)

        // predictionsController.createPrediction already handles:
        // - Extracting workflowId from req.params.id
        // - Extracting chatId from req.body.chatId or req.body.overrideConfig.sessionId
        // - Handling streaming via req.body.streaming
        // - CORS checks based on chatflow.chatbotConfig

        // Therefore, we can directly call it.
        // If any specific widget logic is needed in the future (e.g., different auth,
        // parameter transformation), it can be added here.
        return predictionsController.createPrediction(req, res, next)
    }
}

export default new WidgetController()
