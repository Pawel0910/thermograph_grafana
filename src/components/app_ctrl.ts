import {Color} from "./Color";

export class AppCtrl {
    private static templateUrl = 'components/module.html';

    private container: any;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private color1: Color = new Color();
    private color2: Color = new Color();
    private color3: Color = new Color();
    private color4: Color = new Color();
    private color5: Color = new Color();

    private data: Array<any> = [];

    private dataIndex = 0;
    private dataResponse: any = [];
    private animationOn: boolean = false;
    private timeSpeed = 1;
    private timeSpeedLocal = 1;
    private packageTimeMilis = 120000;
    private sensorsPerRow = 2;
    private time: Date;
    private downloadedTo: Date;
    private startTime: Date;
    private sensorsNumber: number = 0;
    private currentPackageSize: number = 0;
    private currentPackageIndex: number = 0;
    private downloadingData: boolean = false;

    constructor() {
        this.downloadedTo = new Date("2018-02-25 15:30:00");
        this.time = this.downloadedTo;
        this.startTime = this.downloadedTo;
        this.prepareColors();
        this.initData();
    }

    public playAnimation() {
        this.animationOn = true;
        this.nextFrame();
    }

    public stopAnimation() {
        this.animationOn = false;
    }

    public setTime() {
        this.stopAnimation();
        this.dataResponse = [];
        this.downloadedTo = new Date(this.startTime);
        this.getData();
        this.downloadedTo = new Date(this.downloadedTo.getTime() + (this.packageTimeMilis));
    }

    public setTimeSpeed() {
        if (this.timeSpeed > 50) {
            this.timeSpeed = 50;
        } else if (this.timeSpeed < 1) {
            this.timeSpeed = 1;
        }
        this.timeSpeedLocal = this.timeSpeed;
    }

    private initData() {
        this.getInitialData();
        this.downloadedTo = new Date(this.downloadedTo.getTime() + (this.packageTimeMilis));
    }

    private initFrontData() {
        for (let sensorId = 0; sensorId < this.sensorsNumber; sensorId++) {
            this.data[sensorId] = [];
            for (let i = 0; i < 16; i++) {
                this.data[sensorId][i] = [];
            }
        }
        this.afterViewInit();
    }

    private afterViewInit() {
        this.container = document.getElementById('heatmap');
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.height = Math.ceil(this.sensorsNumber / this.sensorsPerRow) * 85;
        this.canvas.width = this.sensorsPerRow * 325;
        this.container.appendChild(this.canvas);
    }

    private countNumberOfSensors() {
        let i = 0;
        while (this.dataResponse[0]._source.data.sensors["sensor_" + i] !== undefined) {
            this.sensorsNumber++;
            i++;
        }
    }

    private drawFrame() {
        for (let sensorId = 0; sensorId < this.sensorsNumber; sensorId++) {
            let colNumber = sensorId % this.sensorsPerRow;
            let rowNumber = Math.floor(sensorId / this.sensorsPerRow);
            for (let i = 0; i < 16; i++) {
                for (let j = 0; j < 4; j++) {
                    this.ctx.fillStyle = this.tempToFiveColorGradient(15, 35, this.data[sensorId][i][j]);
                    this.ctx.fillRect(colNumber * 325 + i * 20, rowNumber * 85 + j * 20, 20, 20);
                }
            }
        }
    }

    private nextFrame() {
        if (this.currentPackageIndex >= 0.5 * this.currentPackageSize && !this.downloadingData) {
            this.downloadingData = true;
            this.getData();
            this.downloadedTo = new Date(this.downloadedTo.getTime() + (this.packageTimeMilis));
        }
        if (this.dataIndex >= this.dataResponse.length) {
            this.dataIndex = 0;
        }

        this.setFrameData();
        this.drawFrame();
        this.dataIndex++;
        if (this.dataIndex + 1 > this.dataResponse.length - this.currentPackageSize) {
            this.currentPackageIndex++;
        }

        if (this.animationOn == true) {
            let delta = new Date(this.dataResponse[this.dataIndex + 1]._source["@timestamp"]).getTime() - new Date(this.dataResponse[this.dataIndex]._source["@timestamp"]).getTime();
            setTimeout(() => this.nextFrame(), delta / this.timeSpeedLocal);
        }
    }

    private setFrameData() {
        if (!this.animationOn) {
            return;
        }

        this.time = new Date(this.dataResponse[this.dataIndex]._source["@timestamp"]);
        for (let i = 0; i < 16; i++) {
            for (let j = 0; j < 4; j++) {
                for (let sensorId = 0; sensorId < this.sensorsNumber; sensorId++) {
                    this.data[sensorId][i][j] = this.dataResponse[this.dataIndex]._source.data.sensors["sensor_" + sensorId].data[j][i];
                }
            }
        }
    }

    private prepareColors() {
        this.color1.r = 226;
        this.color1.g = 235;
        this.color1.b = 31;

        this.color2.r = 248;
        this.color2.g = 148;
        this.color2.b = 65;

        this.color3.r = 204;
        this.color3.g = 71;
        this.color3.b = 120;

        this.color4.r = 125;
        this.color4.g = 3;
        this.color4.b = 168;

        this.color5.r = 13;
        this.color5.g = 8;
        this.color5.b = 135;
    }

    private tempToFiveColorGradient(minimum: number, maximum: number, value: number) {
        let v = (value - minimum) / (maximum - minimum);

        if (v <= 0.25) {
            return this.twoColorGradient(this.color1, this.color2, v);
        } else if (v <= 0.5) {
            return this.twoColorGradient(this.color2, this.color3, v - 0.25);
        } else if (v <= 0.75) {
            return this.twoColorGradient(this.color3, this.color4, v - 0.50);
        } else if (v <= 1.0) {
            return this.twoColorGradient(this.color4, this.color5, v - 0.75);
        }
    }

    private twoColorGradient(color1: Color, color2: Color, value: number) {
        let v = value * 4;

        let r = color1.r * (1.0 - v) + color2.r * v;
        let g = color1.g * (1.0 - v) + color2.g * v;
        let b = color1.b * (1.0 - v) + color2.b * v;

        return "rgb(" + r + "," + g + "," + b + ")";
    }

    private dateToQueryString(date: Date): string {
        let tempDate = new Date(date);
        tempDate.setHours(date.getHours() + 1);
        let formattedDate: string = "";
        let isoDate: string = tempDate.toISOString();

        let year: string = isoDate.substring(0, 4);
        let month: string = isoDate.substring(5, 7);
        let day: string = isoDate.substring(8, 10);
        let time: string = isoDate.substring(11, 19);

        formattedDate += day;
        formattedDate += "-";
        formattedDate += month;
        formattedDate += "-";
        formattedDate += year;
        formattedDate += " ";
        formattedDate += time;

        return formattedDate;
    }

    private getData() {
        let xhttp = new XMLHttpRequest();
        xhttp.open("POST", "http://localhost:9200/thermoeye_prod/_search", true);
        xhttp.setRequestHeader("Content-type", "application/json");
        xhttp.send(JSON.stringify({
            from: 0,
            size: 5000,
            query: {
                bool: {
                    must: {
                        match_phrase: {
                            device: "0002-0001"
                        }
                    },
                    filter: {
                        range: {
                            "@timestamp": {
                                gte: this.dateToQueryString(this.downloadedTo),
                                lte: this.dateToQueryString(new Date(this.downloadedTo.getTime() + (this.packageTimeMilis - 1000))),
                                format: "dd-MM-yyyy HH:mm:ss"
                            }
                        }

                    }
                }
            },
            sort: [
                {
                    "@timestamp": {
                        order: "asc"
                    }
                }
            ]
        }));
        let thisObject = this;
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                let resTemp = JSON.parse(xhttp.responseText).hits.hits;
                // console.log(resTemp);
                thisObject.currentPackageSize = resTemp.length;
                thisObject.currentPackageIndex = 0;
                thisObject.dataResponse = thisObject.dataResponse.concat(resTemp);
                thisObject.downloadingData = false;
            }
        };
    }

    private getInitialData() {
        let xhttp = new XMLHttpRequest();
        xhttp.open("POST", "http://localhost:9200/thermoeye_prod/_search", true);
        xhttp.setRequestHeader("Content-type", "application/json");
        xhttp.send(JSON.stringify({
            from: 0,
            size: 5000,
            query: {
                bool: {
                    must: {
                        match_phrase: {
                            device: "0002-0001"
                        }
                    },
                    filter: {
                        range: {
                            "@timestamp": {
                                gte: this.dateToQueryString(this.downloadedTo),
                                lte: this.dateToQueryString(new Date(this.downloadedTo.getTime() + (this.packageTimeMilis - 1000))),
                                format: "dd-MM-yyyy HH:mm:ss"
                            }
                        }

                    }
                }
            },
            sort: [
                {
                    "@timestamp": {
                        order: "asc"
                    }
                }
            ]
        }));
        let thisObject = this;
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                let resTemp = JSON.parse(xhttp.responseText).hits.hits;
                // console.log(resTemp);
                thisObject.currentPackageSize = resTemp.length;
                thisObject.dataResponse = thisObject.dataResponse.concat(resTemp);

                thisObject.countNumberOfSensors();
                thisObject.initFrontData();
            }
        };
    }
}