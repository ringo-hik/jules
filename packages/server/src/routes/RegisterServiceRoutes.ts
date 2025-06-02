import express, { Request, Response, NextFunction } from 'express';
import { RegisterServiceController } from '../controllers/RegisterServiceController';
import { verifyToken } from '../enterprise/middleware/passport/index'; // Import verifyToken

const router = express.Router();
const controller = new RegisterServiceController();

// Add verifyToken middleware before the controller handler
// This will ensure that requests to this endpoint are authenticated via JWT cookie.
router.post('/', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
    await controller.registerApiAsTool(req, res, next);
});

export default router;
