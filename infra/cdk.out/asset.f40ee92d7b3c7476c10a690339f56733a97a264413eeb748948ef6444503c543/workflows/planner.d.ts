interface PlannerEvent {
    action: string;
    workTree?: any;
    objective?: string;
}
export declare function handler(event: PlannerEvent): Promise<any>;
export {};
