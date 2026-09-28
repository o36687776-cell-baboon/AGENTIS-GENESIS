interface WorkerEvent {
    action: string;
    workTreeId?: string;
    objective?: string;
    workTree?: any;
    plan?: any;
    task?: any;
    tasks?: any[];
    executionResults?: any[];
    results?: any;
    verification?: any;
}
export declare function handler(event: WorkerEvent): Promise<any>;
export {};
