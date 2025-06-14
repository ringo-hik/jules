@echo off
REM =================================================================
REM  Refactored Project File Structure Creation Script
REM  This script creates the directory structure and empty files
REM  for the refactored AI Agent project.
REM =================================================================

ECHO Creating project directory structure...

REM --- Backend Directory Structure (src/main/java & resources) ---
md "src\main\java\com\example\aiagent\controller" 2>nul
md "src\main\java\com\example\aiagent\domain" 2>nul
md "src\main\java\com\example\aiagent\dto\category" 2>nul
md "src\main\java\com\example\aiagent\dto\chat" 2>nul
md "src\main\java\com\example\aiagent\dto\feedback" 2>nul
md "src\main\java\com\example\aiagent\dto\history" 2>nul
md "src\main\java\com\example\aiagent\exception" 2>nul
md "src\main\java\com\example\aiagent\mapper" 2>nul
md "src\main\java\com\example\aiagent\service" 2>nul
md "src\main\resources\mappers" 2>nul

REM --- Frontend Directory Structure (src) ---
md "src\components" 2>nul
md "src\services" 2>nul
md "src\styles" 2>nul

ECHO.
ECHO Creating empty project files...

REM --- Backend Files ---
ECHO [BE] Creating Domain objects...
type NUL > "src\main\java\com\example\aiagent\domain\ChatMessage.java"
type NUL > "src\main\java\com\example\aiagent\domain\ChatSession.java"
type NUL > "src\main\java\com\example\aiagent\domain\ContextData.java"

ECHO [BE] Creating DTOs...
type NUL > "src\main\java\com\example\aiagent\dto\category\CategoryDto.java"
type NUL > "src\main\java\com\example\aiagent\dto\chat\ChatRequest.java"
type NUL > "src\main\java\com\example\aiagent\dto\chat\ChatResponse.java"
type NUL > "src\main\java\com\example\aiagent\dto\feedback\FeedbackRequest.java"
type NUL > "src\main\java\com\example\aiagent\dto\history\HistorySummaryDto.java"

ECHO [BE] Creating Exception Handlers...
type NUL > "src\main\java\com\example\aiagent\exception\ErrorResponse.java"
type NUL > "src\main\java\com\example\aiagent\exception\GlobalExceptionHandler.java"

ECHO [BE] Creating Controller, Service, Mapper...
type NUL > "src\main\java\com\example\aiagent\controller\SmartSearchController.java"
type NUL > "src\main\java\com\example\aiagent\service\SmartSearchService.java"
type NUL > "src\main\java\com\example\aiagent\mapper\SmartSearchMapper.java"

ECHO [BE] Creating Mapper XML...
type NUL > "src\main\resources\mappers\SmartSearchMapper.xml"

REM --- Frontend Files ---
ECHO [FE] Creating Vue Components...
type NUL > "src\components\ChatTab.vue"
type NUL > "src\components\HistoryTab.vue"
type NUL > "src\components\Toast.vue"
type NUL > "src\components\FloatChatLayout.vue"

ECHO [FE] Creating JS Service...
type NUL > "src\services\aiAgentService.js"

ECHO [FE] Creating SCSS Style File...
type NUL > "src\styles\unified_styles.scss"


ECHO.
ECHO =======================================
ECHO  All files and directories created.
ECHO =======================================
ECHO.
pause
