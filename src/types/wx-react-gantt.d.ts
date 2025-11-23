declare module 'wx-react-gantt' {
    import React from 'react';

    export interface GanttProps {
        tasks: any[];
        scales?: any[];
        columns?: any[];
        [key: string]: any;
    }

    export class Gantt extends React.Component<GanttProps> { }
}
