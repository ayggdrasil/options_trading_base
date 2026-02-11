export enum MESSAGE_TYPE {
    PROCESS_TERMINATED_SIGINT = 'Process terminated (SIGINT)',
    PROCESS_TERMINATED_SIGTERM = 'Process terminated (SIGTERM)',
    UNCAUGHT_EXCEPTION = 'Uncaught Exception',
    UNHANDLED_REJECTION = 'Unhandled Rejection',
    EVENT_NODE_STARTING = 'Eventnode starting..',
}