/**
 * Interface for a masterGrid object
 */
interface masterGrid {
    Lights: Light[];
    Roads: Road[];
    Cars: Car[];

    buffer: number;
    gridSize: number;
    stepSize: number;

    masterQueue: PriorityQueue;
    completedQueue: gridEvent[];
    masterTime: number;

    results: number[][];
    gridResults: number[];
    iterations: number;
    currentIteration: number;
    gridIteration: number;
    iterate(): void;

    updateSize(gridSize: number, width: number):void;
    nextEvent():gridEvent;
    reset(): void;

    reactionTime:number;
}

/**
 * Constructs a masterGrid interface with default values and buffer
 * @param buffer pixels on edge of canvas
 */
function masterGridFactory(buffer: number): masterGrid {
    return {
        Lights: [],
        Roads: [],
        Cars: [],
        results: [[]],
        gridResults: [],
 
        buffer: buffer,
        gridSize: 0,
        stepSize: 0,
        iterations: 50,
        //STARTS COUNTING FROM 1
        currentIteration: 1,
        gridIteration: 1,



        masterQueue: PriorityQueueFactory(),
        completedQueue: [],
        masterTime: 0,

        iterate():void {


            this.currentIteration++;

            if(this.gridIteration == this.iterations && this.currentIteration == 3) {
                
                this.currentIteration--;
                this.gridResults[this.gridIteration-1] = testImprovements();
                this.currentIteration++;

                console.log(`ALL FINISHED`);
                console.log(JSON.stringify(GridController.gridResults));
                paused = true;
                playPauseButton.elt.innerHTML = 'Play ⏵';
            }
            else {
                //if this is the run after the baseline, run again but modified
                if(this.currentIteration == 2) {
                    this.reset();
                    console.log(`run adjusted grid ${this.gridIteration}`);
                    for(let i = 0; i<GridController.Cars.length; i++) {
                        GridController.Cars[i].reRoute = true;
                    }

                    for(let i = 0; i<GridController.Lights.length; i++) {
                        GridController.Lights[i].smartLogic = true;
                    }
                }

                //otherwise if we have baseline and full logic run, test new grid setup
                else if(this.currentIteration == 3) {
                    clearInterval(runInterval);

                    this.currentIteration--;
                    this.gridResults[this.gridIteration-1] = testImprovements();
                    this.currentIteration++;

                    this.gridIteration++;
                    console.log(`generateNewGrid ${this.gridIteration}/${this.iterations}`);


                    //hard reset
                    this.Lights = [];
                    this.Roads = [];
                    this.Cars = [];

                    this.masterQueue = PriorityQueueFactory();
                    this.completedQueue = [];
                    this.masterTime = 0;

                    this.results = [[]];
                    this.currentIteration = 1;

                    generateLights();
                    generateRoads();
                    removeLights();
                    removeRoads();

                    generateLanes();

                    continuousCarsDelay = 10/(GridController.Lights.length/50);

                    paused = undefined;

                    setUpCars(GridController.Lights.length*4);
                    startCars();

                    GridController.masterQueue.enqueue(gridEventFactory(GridController.masterTime, generateContinuousCarsCreateEventHandler(continuousCarsDelay), "first continuous car"));
                    GridController.masterQueue.enqueue(gridEventFactory(GridController.masterTime+continuousCarsTime, stopContinuousCarsCreateEventHandler(), "stops continuous car generation"));
                }


                //fractional network rerouting
                /*this.Cars = shuffle(this.Cars);
                let quota = Math.floor(networkedPercent*this.Cars.length);
                let reRouted = 0;
                while(reRouted < quota) {
                    this.Cars[reRouted].reRoute = true;
                    reRouted++;
                }*/

                /*//fractional smartLights (already shuffled from removeLights)
                let lightQuota = Math.floor(smartLightPercent*this.Lights.length);
                let nowSmart = 0;
                while(nowSmart < lightQuota) {
                    this.Lights[nowSmart].smartLogic = true;
                    nowSmart++;
                }*/


                runGrid();

                paused = false;
                playPauseButton.elt.innerHTML = `Pause ||`;
            }
        },

        /**
         * Updates the size of the grid (used if slider value changes)
         * @param gridSize square side length
         * @param width pixel width of canvas
         */
        updateSize(gridSize: number, width: number):void {
            this.gridSize = gridSize;
            this.stepSize = (width-this.buffer*2)/(this.gridSize-1);
        },
        /**
         * runs the next event in the masterQueue
         */
        nextEvent():gridEvent {
            //dequeue
            let eventToRun = this.masterQueue.dequeue();
            this.completedQueue.push(eventToRun);

            //update time
            this.masterTime = eventToRun.priority;
            timeLabel.innerHTML = `${Math.floor(GridController.masterTime)} seconds`;

            //run event
            //console.log(eventToRun);
            eventToRun.value();
            return eventToRun;
        },
        reset(): void {
            this.masterQueue = PriorityQueueFactory();
            this.completedQueue = [];
            this.masterTime = 0;
            clearInterval(runInterval);
            paused = undefined;

            //resets cars
            for(let i = 0; i<this.Cars.length; i++) {
                let tempCar: Car = this.Cars[i];

                tempCar.lane = undefined;
                tempCar.light = tempCar.path[0];
                tempCar.pathIndex = 0;

                tempCar.endTime = 0;
                tempCar.coords = [];
                tempCar.totalDistance = 0;
                tempCar.completed = false;

                //ALLOWS CAR TO REROUTE DURING SECOND RUN
                tempCar.reRoute = false;

                this.masterQueue.enqueue(gridEventFactory(tempCar.startTime, tempCar.start(), `start car ${tempCar.id}`))
            }

            

            //resets lights and lanes
            for(let i = 0; i<this.Lights.length; i++) {
                let tempLight: Light = this.Lights[i];
                tempLight.f = Number.MAX_SAFE_INTEGER;
                tempLight.parent = null;
                tempLight.inPath = false;
                tempLight.open = false;
                tempLight.closed = false;
                tempLight.activeLane = null;
                tempLight.startCycleTime = 0;

                //clones originalLaneOrder to incomingLanes
                tempLight.incomingLanes = tempLight.originalLaneOrder.map((x) => x);

                tempLight.smartLogic = false;

                for(let j = 0; j<tempLight.incomingLanes.length; j++) {
                    let tempLane = tempLight.incomingLanes[j];
                    tempLane.carsExiting = [];
                    tempLane.entranceQueue = [];
                    tempLane.exitQueue = [];
                    tempLane.allCars = 0;
                    tempLane.active = false;
                }
            }

            
        },

        reactionTime: reactionTime
    }
}

function howManyRerouted() {
    let count = 0;

    for(let i = 0; i<GridController.Cars.length; i++) {
        if(GridController.Cars[i].reRoute) {
            count++;
        }
    }

    console.log(count);
}

function howManySmart() {
    let count = 0;

    for(let i = 0; i<GridController.Lights.length; i++) {
        if(GridController.Lights[i].smartLogic) {
            count++;
        }
    }

    console.log(count);
}

/**
 * Runs through all Lights and clears their aStar related values
 */
function clearAStar() {
    for(let i = 0; i<GridController.Lights.length; i++) {
        GridController.Lights[i].f = Number.MAX_SAFE_INTEGER;
        GridController.Lights[i].inPath = false;
        GridController.Lights[i].parent = null;
        GridController.Lights[i].open = false;
        GridController.Lights[i].closed = false;
    }
}

/**
 * does aStar between two light objects
 * @param start first Light object
 * @param end second Light object
 * @param drawPath whether or not to visualize the path
 */
function aStar(start: Light, end: Light, drawPath: boolean) {
    //resets everything
    clearAStar();

    let openList: Light[] = [];
    let closedList: Light[] = [];

    let lowestIndex = 0;

    //creates first node as starting node
    start.f = lightDistance(start, end);

    let current = start;

    //while end not reached and current node exists
    while(current != end && current != undefined) {
        let neighbors = current.neighbors;
        for(let i = 0; i<neighbors.length; i++) {
            let neighbor = neighbors[i];

            //if not yet visited, push to open list and update values
            if(neighbor.open == false && neighbor.closed == false) {
                openList.push(neighbor);
                neighbor.open = true;

                let f = lightDistance(start, neighbor) + lightDistance(neighbor, end);

                neighbor.f = f;
                neighbor.parent = current;
                
            }
            //if already visited but not closed, compare current f value to old, if less, update
            else if(neighbor.open == true) {
                let f = lightDistance(start, neighbor) + lightDistance(neighbor, end);

                if(f < neighbor.f) {
                    neighbor.f = f;
                    neighbor.parent = current;
                }
            }
        }

        //updates values for current
        current.open = false;
        current.closed = true;
        closedList.push(current);


        //finds next value
        lowestIndex = 0;
        for(let i = 1; i<openList.length; i++) {
            if(openList[i].f < openList[lowestIndex].f) {
                lowestIndex = i;
            }
        }

        //sets current to next value
        current = openList.splice(lowestIndex, 1)[0];
    }

    //if no path found, return empty array
    if(current === undefined) {
        return [];
    }

    //otherwise, find and returns the final path
    let path: Light[] = [];
    let distance = 0;
    let temp = current;
    if(drawPath) {
        temp.inPath = true;
    }

    path.push(temp);
    while(temp.parent != null) {
        distance+=lightDistance(temp, temp.parent);
        path.push(temp.parent);
        temp = temp.parent;
        if(drawPath) {
            temp.inPath = true;
        }
    }

    path.reverse();
    return path;
}

/**
 * does modified aStar between two light objects taking into account congestion along that route
 * @param start first Light object
 * @param end second Light object
 * @param drawPath whether or not to visualize the path
 */
function modifiedAStar(start: Light, end: Light, drawPath: boolean) {
    //resets everything
    clearAStar();

    let openList: Light[] = [];
    let closedList: Light[] = [];

    let lowestIndex = 0;

    //creates first node as starting node
    start.f = lightDistance(start, end);

    let current = start;

    //while end not reached and current node exists
    while(current != end && current != undefined) {
        let neighbors = current.neighbors;
        for(let i = 0; i<neighbors.length; i++) {
            let neighbor = neighbors[i];

            //if not yet visited, push to open list and update values
            if(neighbor.open == false && neighbor.closed == false) {
                openList.push(neighbor);
                neighbor.open = true;

                //CONGESTION CALCULATION
                let congestion = 0;
                for(let j = 0; j<neighbor.incomingLanes.length; j++) {
                    let tempLane = neighbor.incomingLanes[j];
                    congestion+=tempLane.allCars;
                }

                let f = lightDistance(start, neighbor) + lightDistance(neighbor, end) + congestion*congestionWeight;

                neighbor.f = f;
                neighbor.parent = current;
                
            }
            //if already visited but not closed, compare current f value to old, if less, update
            else if(neighbor.open == true) {

                //CONGESTION CALCULATION
                let congestion = 0;
                for(let j = 0; j<neighbor.incomingLanes.length; j++) {
                    let tempLane = neighbor.incomingLanes[j];
                    congestion+=tempLane.allCars;
                }

                let f = lightDistance(start, neighbor) + lightDistance(neighbor, end) + congestion*congestionWeight;

                if(f < neighbor.f) {
                    neighbor.f = f;
                    neighbor.parent = current;
                }
            }
        }

        //updates values for current
        current.open = false;
        current.closed = true;
        closedList.push(current);


        //finds next value
        lowestIndex = 0;
        for(let i = 1; i<openList.length; i++) {
            if(openList[i].f < openList[lowestIndex].f) {
                lowestIndex = i;
            }
        }

        //sets current to next value
        current = openList.splice(lowestIndex, 1)[0];
    }

    //if no path found, return empty array
    if(current === undefined) {
        return [];
    }

    //otherwise, find and returns the final path
    let path: Light[] = [];
    let distance = 0;
    let temp = current;
    if(drawPath) {
        temp.inPath = true;
    }

    path.push(temp);
    while(temp.parent != null) {
        distance+=lightDistance(temp, temp.parent);
        path.push(temp.parent);
        temp = temp.parent;
        if(drawPath) {
            temp.inPath = true;
        }
    }

    path.reverse();
    return path;
}


/**
 * calculate euclidean distance between two points
 * @param x1 number
 * @param y1 number
 * @param x2 number
 * @param y2 number
 */
function calculateDistance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x1-x2)**2 + (y1-y2)**2);
}

/**
 * calculate euclidean distance between two Light objects
 * @param start first Light object
 * @param end second Light object
 */
function lightDistance(start: Light, end: Light) {
    return Math.sqrt((start.coords[0] - end.coords[0])**2 + (start.coords[1] - end.coords[1])**2);
}

function pathTime(path: Light[]): number {
    let time = 0;
    for(let i = 1; i<path.length; i++) {
        let light1 = path[i-1];
        let light2 = path[i];
        let tempLane: Lane;

        for(let j = 0; j<light2.incomingLanes.length; j++) {
            if(light2.incomingLanes[j].entrance == light1) {
                tempLane = light2.incomingLanes[j];
            }
        }

        let tempTime = tempLane.timeToTravel();

        time+=tempTime;

        //runs
        time+=light2.travelTime;
    }

    return time;
}

//runs the grid with a specified time between events
let runInterval;
function runGridInterval(delay: number) {
    startLightCounters();

    runInterval = setInterval(() => {
        if(!paused) {
            GridController.nextEvent();
        }
    }, delay);
}

//runs the grid with a pre-specified time between events
function runGrid() {
    startLightCounters();

    runInterval = setInterval(() => {
        if(!paused) {
            GridController.nextEvent();
        }
    }, 1);
}