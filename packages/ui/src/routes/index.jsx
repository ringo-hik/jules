import { useRoutes } from 'react-router-dom'

// routes
import MainRoutes from './MainRoutes'
import CanvasRoutes from './CanvasRoutes'
import ChatbotRoutes from './ChatbotRoutes'
import config from '@/config'
import AuthRoutes from '@/routes/AuthRoutes'
import ExecutionRoutes from './ExecutionRoutes'
import ChatWidget from '@/views/widget/ChatWidget'

// ==============================|| ROUTING RENDER ||============================== //

const WidgetRoutes = {
    path: '/widget/:workflowId',
    element: <ChatWidget />
}

export default function ThemeRoutes() {
    return useRoutes([MainRoutes, AuthRoutes, CanvasRoutes, ChatbotRoutes, ExecutionRoutes, WidgetRoutes], config.basename)
}
