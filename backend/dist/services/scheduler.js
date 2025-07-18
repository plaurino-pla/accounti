"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("../utils/logger");
const invoiceService_1 = require("./invoiceService");
const initializeScheduler = () => {
    node_cron_1.default.schedule('0 2 * * *', async () => {
        logger_1.logger.info('Running Free tier invoice processing');
        try {
            const invoiceService = new invoiceService_1.InvoiceService();
            logger_1.logger.info('Free tier processing completed');
        }
        catch (error) {
            logger_1.logger.error('Free tier processing failed:', error);
        }
    });
    node_cron_1.default.schedule('0 */6 * * *', async () => {
        logger_1.logger.info('Running Pro tier invoice processing');
        try {
            const invoiceService = new invoiceService_1.InvoiceService();
            logger_1.logger.info('Pro tier processing completed');
        }
        catch (error) {
            logger_1.logger.error('Pro tier processing failed:', error);
        }
    });
    node_cron_1.default.schedule('0 * * * *', async () => {
        logger_1.logger.info('Running Premium tier invoice processing');
        try {
            const invoiceService = new invoiceService_1.InvoiceService();
            logger_1.logger.info('Premium tier processing completed');
        }
        catch (error) {
            logger_1.logger.error('Premium tier processing failed:', error);
        }
    });
    logger_1.logger.info('Scheduler initialized successfully');
};
exports.initializeScheduler = initializeScheduler;
//# sourceMappingURL=scheduler.js.map