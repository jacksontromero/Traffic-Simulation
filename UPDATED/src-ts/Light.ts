/**
 * Interface for a light object
 */
interface Light {
    /**This light's ID */
    id: number;

    /**amount of time it takes to travel through this light */
    travelTime: number;

    /**pixel coordinates for this light */
    coords: number[];

    /**array of lights that are connect to this light via a road */
    neighbors: Light[];

    /**roads connected to this light */
    roads: Road[];

    /**a* shit */
    f: number;
    /**a* shit */
    parent: Light;
    /**a* shit */
    inPath: boolean;
    /**a* shit */
    open: boolean;
    /**a* shit */
    closed: boolean;

    /**array of lanes incoming to this light */
    incomingLanes: Lane[];

    /**original order of the lanes (so the light cycles can be reset) */
    originalLaneOrder: Lane[];

    /**currently active lane */
    activeLane: Lane;

    /**amount of time it takes for light to cycle */
    cycleTime: number;

    /**time the light started current cycle */
    startCycleTime: number;

    /**whether or not the light is shortcircuited to always on */
    noLogic: boolean;

    /**whether or not the light does smart switching */
    smartLogic: boolean;

    /**time when the light will skip the next*/
    skipCycleAtTime: number;

    /**whether or not the light is currently in the process of switching (kinda like yellow light?) */
    currentlySkipping: boolean;

    /**gridEvent for when the next cycle is scheduled */
    nextCycleEventObject: gridEvent;

    /**returns a function for starting the light's cycle */
    startCycleCreateEventHandler(): Function;

    /**returns a function to cycle the light */
    cycleCreateEventHandler(): Function;

    /**returns a function to send next car in active lane */
    nextCarMainCreateEventHandler(): Function;

    /**returns a function to send next car in opposite lane */
    nextCarOppositeCreateEventHandler(): Function;

}

/**
 * Constructs a Light interface with default values
 * @param id Light number
 */
function lightFactory(id: number): Light {
    return {
        id: id,
        travelTime: lightTravelTime,
        coords: [],
        neighbors: [],
        roads: [],
        f: Number.MAX_SAFE_INTEGER,
        parent: null,
        inPath: false,
        open: false,
        closed: false,
        incomingLanes: [],
        originalLaneOrder: [],
        activeLane: null,
        cycleTime: Math.floor(Math.random()*cycleTimeVariability+minCycleTime),
        startCycleTime: 0,
        noLogic: false,
        smartLogic: false,
        nextCycleEventObject: undefined,
        skipCycleAtTime: undefined,
        currentlySkipping: false,

        startCycleCreateEventHandler(): Function {
            return () => {
                //clones incomingLanes to originalLaneOrder
                this.originalLaneOrder = this.incomingLanes.map((x) => x);

                //if less than two neighbors, short circuit to always on
                if(this.neighbors.length <= 2) {
                    this.noLogic = true;
                    for(let i = 0; i<this.incomingLanes.length; i++) {
                        this.incomingLanes[i].active = true;
                        this.incomingLanes[i].alwaysActive = true;
                    }
                }
                else {
                    let time = GridController.masterTime;

                    //sets active lane
                    this.activeLane = this.incomingLanes[0];
    
                    //Immediately begin a light cycle
                    GridController.masterQueue.enqueue(gridEventFactory(time, this.cycleCreateEventHandler(), `start cycle light ${this.id}`));
                }
            }
        },
        cycleCreateEventHandler(): Function {
            return () => {
                let time = GridController.masterTime;

                //if the current time is not the time that the light is supposed to skip
                if(time != this.skipCycleAtTime) {
                    this.currentlySkipping = false;

                    //resets active lanes from last run
                    this.activeLane.active = false;
                    let oldOppositeLane = this.activeLane.getOpposite();
                    if(oldOppositeLane) {
                        oldOppositeLane.active = false;
                    }

                    //cycles to the next active lane
                    let lastVal = this.incomingLanes.shift();
                    this.incomingLanes.push(lastVal);
                    this.activeLane = this.incomingLanes[0];

                    //if the new active lane is the same as the old opposite lane, just shift one more time
                    //this case is when there are three lanes coming in to one light
                    if(oldOppositeLane) {
                        if(oldOppositeLane == this.activeLane) {
                            lastVal = this.incomingLanes.shift();
                            this.incomingLanes.push(lastVal);
                            this.activeLane = this.incomingLanes[0];
                        }
                    }

                    //sets up new cycle
                    this.activeLane.active = true;

                    //update startCycleTime to time of new cycle
                    this.startCycleTime = time;

                    //if a queue exists on the active lane
                    if(this.activeLane.exitQueue.length > 0) {
                        //send next car on active lane
                        GridController.masterQueue.enqueue(gridEventFactory(time, this.nextCarMainCreateEventHandler(), `start first car in ${this.id}'s queue`));
                    }

                    //finds opposite lane
                    let oppositeLane = this.activeLane.getOpposite();

                    //if it exists
                    if(oppositeLane) {
                        //make it active
                        oppositeLane.active = true;

                        //if a queue exists on the opposite lane
                        if(oppositeLane.exitQueue.length > 0) {

                            //send next car on opposite lane
                            GridController.masterQueue.enqueue(gridEventFactory(time, this.nextCarOppositeCreateEventHandler(), `start first car in ${this.id}'s queue (opp)`));
        
                        }
                    }

                    //cycle the light again after its cycle time
                    this.nextCycleEventObject = gridEventFactory(time+this.cycleTime, this.cycleCreateEventHandler(), `naturally cycle light ${this.id}`);
                    GridController.masterQueue.enqueue(this.nextCycleEventObject);
                }
                else {
                    //DO NOTHING
                }
            }
        },

        /**
         * Returns a function that sends the first car from the active Lane's queue
         * THESE FUNCTIONS ARE HELL, SRY BRO
         * all of the smart light stuff is kinda implemented wrong, it should just check if a light not in the cycle has a queue
         * UNDO TO HERE IF IT ALL GOES TO SHIT
         */
        nextCarMainCreateEventHandler(): Function {
            return () => {
                let time = GridController.masterTime;

                /**number of cars waiting on inactive lanes*/
                let waitingCars = 0;
                let oppositeLane = this.activeLane.getOpposite();

                //for each incoming lane, add to total number of waiting cars
                for(let i = 0; i<this.incomingLanes.length; i++) {
                    let tempLane = this.incomingLanes[i];

                    if(tempLane != this.activeLane && tempLane != oppositeLane) {
                        waitingCars+=tempLane.exitQueue.length;
                    }
                }

                if(verbose) {
                    console.log(`${waitingCars} are waiting at ${this.id}`);
                }

                //if the cycle time has not elapsed & there are cars in the active queue
                if(time < this.startCycleTime+this.cycleTime-this.travelTime && this.activeLane.exitQueue.length > 0) {
                    let tempCar = this.activeLane.exitQueue.shift();
                    if(verbose) {
                        console.log(`${tempCar.id} left ${this.id}'s queue at ${time}/${this.startCycleTime+this.cycleTime-this.travelTime}`);
                        console.log(`start: ${this.startCycleTime} \ncycle: ${this.cycleTime}\nLane ${this.activeLane.entrance.id} to ${this.activeLane.exit.id}`);
                    }

                    //send next car to its next lane after it reacts and clears the intersection
                    GridController.masterQueue.enqueue(gridEventFactory(time+GridController.reactionTime+this.travelTime, tempCar.moveToLaneCreateEventHandler(), `move ${this.id}'s first car to lane`));
                    GridController.masterQueue.enqueue(gridEventFactory(time + GridController.reactionTime, this.nextCarMainCreateEventHandler(), `check ${this.id}'s next car`));
                }

                //else if there is an opposite lane
                else if(oppositeLane) {
                    //if the light is smart, time has not elapsed, no cars actively waiting on active lane, and cars waiting on inactive lanes, cycle
                    if(this.smartLogic && time < this.startCycleTime+this.cycleTime-this.travelTime && this.activeLane.exitQueue.length == 0 && oppositeLane.exitQueue.length == 0 && waitingCars != 0 && this.currentlySkipping == false) {
                        //CYCLE NOW
                        //remove current light cycle event
    
                        //let queueIndex = GridController.masterQueue.values.indexOf(this.nextCycleEventObject);
                        //GridController.masterQueue.values.splice(queueIndex, 1);

                        //updates skipCycleAtTime to be the priority of the current nextCycle object
                        this.skipCycleAtTime = this.nextCycleEventObject.priority;

                        if(verbose) {
                            console.log(`SMART SKIP FROM ACTIVE LANE`);
                        }

                        //update light to currently skipping state
                        this.currentlySkipping = true;

                        //THIS IS KINDA SUS IDK IF THIS ENTIRE FUNCTION EVEN WORKS
                        let correction = 0;
                        if(this.travelTime + time == this.skipCycleAtTime) {
                            correction = 1;
                        }
                        //add a new light cycle event that cycles immediately
                        this.nextCycleEventObject = gridEventFactory(time+this.travelTime+correction, this.cycleCreateEventHandler(), `immediately cycle light ${this.id}`);
                        GridController.masterQueue.enqueue(this.nextCycleEventObject);
                    }
                    else {
                        if(verbose) {
                            console.log(`${this.id} could not send car, time elapsed or queue empty`);
                        }
                    }
                }
                //no opp lane
                else {
                    if(this.smartLogic && time < this.startCycleTime+this.cycleTime-this.travelTime && this.activeLane.exitQueue.length == 0 && waitingCars != 0 && this.currentlySkipping == false) {
                        //CYCLE NOW
                        //remove current light cycle event
    
                        // let queueIndex = GridController.masterQueue.values.indexOf(this.nextCycleEventObject);
                        // GridController.masterQueue.values.splice(queueIndex, 1);

                        //updates skipCycleAtTime to be the priority of the current nextCycle object
                        this.skipCycleAtTime = this.nextCycleEventObject.priority;

                        if(verbose) {
                            console.log(`SMART SKIP FROM ACTIVE LANE`);
                        }

                        this.currentlySkipping = true;

                        let correction = 0;
                        if(this.travelTime + time == this.skipCycleAtTime) {
                            correction = 1;
                        }
                        //add a new light cycle event that cycles immediately
                        this.nextCycleEventObject = gridEventFactory(time+this.travelTime+correction, this.cycleCreateEventHandler(), `immediately cycle light ${this.id}`);
                        GridController.masterQueue.enqueue(this.nextCycleEventObject);
                    }
                    else {
                        if(verbose) {
                            console.log(`${this.id} could not send car, time elapsed or queue empty`);
                        }
                    }
                }
            }
        },
        nextCarOppositeCreateEventHandler(): Function {
            return () => {
                let time = GridController.masterTime;

                //finds opposite lane 
                let oppositeLane = this.activeLane.getOpposite();

                let waitingCars = 0;
                for(let i = 0; i<this.incomingLanes.length; i++) {
                    let tempLane = this.incomingLanes[i];

                    if(tempLane != this.activeLane && tempLane != oppositeLane) {
                        waitingCars+=tempLane.exitQueue.length;
                    }
                }

                if(verbose) {
                    console.log(`${waitingCars} are waiting at ${this.id}`);
                }

                //checks just in case this was put in the queue after a light change occurred and the new activeLane doesn't have an opposite
                if(oppositeLane) {
                    //if the cycle time has not elapsed & there are cars in the queue
                    if(time < this.startCycleTime+this.cycleTime-this.travelTime && oppositeLane.exitQueue.length > 0) {
                        let tempCar = oppositeLane.exitQueue.shift();
                        if(verbose) {
                            console.log(`${tempCar.id} left ${this.id}'s queue at ${time}/${this.startCycleTime+this.cycleTime-this.travelTime}`);
                            console.log(`start: ${this.startCycleTime} \ncycle: ${this.cycleTime}\nLane ${oppositeLane.entrance.id} to ${oppositeLane.exit.id}`);
                        }

                        //send next car to its next lane after it reacts and clears the intersection
                        GridController.masterQueue.enqueue(gridEventFactory(time+GridController.reactionTime+this.travelTime, tempCar.moveToLaneCreateEventHandler(), `move ${this.id}'s first car to lane (opp)`));
                        GridController.masterQueue.enqueue(gridEventFactory(time + GridController.reactionTime, this.nextCarOppositeCreateEventHandler(), `check ${this.id}'s next car (opp)`));
                    }

                    else if(this.smartLogic && time < this.startCycleTime+this.cycleTime-this.travelTime && this.activeLane.exitQueue.length == 0 && oppositeLane.exitQueue.length == 0 && waitingCars != 0 && this.currentlySkipping == false) {
                        //CYCLE NOW
                        //remove current light cycle event

                        // let queueIndex = GridController.masterQueue.values.indexOf(this.nextCycleEventObject);
                        // GridController.masterQueue.values.splice(queueIndex, 1);

                        //updates skipCycleAtTime to be the priority of the current nextCycle object
                        this.skipCycleAtTime = this.nextCycleEventObject.priority;

                        if(verbose) {
                            console.log(`SMART SKIP FROM ACTIVE LANE`);

                        }

                        this.currentlySkipping = true;

                        let correction = 0;
                        if(this.travelTime + time == this.skipCycleAtTime) {
                            correction = 1;
                        }
                        //add a new light cycle event that cycles immediately
                        this.nextCycleEventObject = gridEventFactory(time+this.travelTime+correction, this.cycleCreateEventHandler(), `immediately cycle light ${this.id}`);
                        GridController.masterQueue.enqueue(this.nextCycleEventObject);
                    }

                    else {
                        if(verbose) {
                            console.log('could not send car, time elapsed or queue empty (opp)');
                        }
                    }
                }
            }
        }
    }
}

/**
 * Generates a grid of lights and then removes them randomly
 */
function generateLights() {
    GridController.Lights = [];
    GridController.Roads = [];

    GridController.updateSize(gridSlider.value(), width);

    for(let i = 0; i<GridController.gridSize; i++) {
        for(let j = 0; j<GridController.gridSize; j++) {
            let tempLight:Light = lightFactory(GridController.gridSize*i +j);
            tempLight.coords = Array<number>(GridController.stepSize*(i)+GridController.buffer, GridController.stepSize*(j)+GridController.buffer);
            GridController.Lights.push(tempLight);
        }
    }
}

function generateTestLights() {
    GridController.Lights = [];
    GridController.Roads = [];

    GridController.updateSize(gridSlider.value(), width);

    for(let i = 0; i<GridController.gridSize; i++) {
        let tempHorLight:Light = lightFactory(i);
        tempHorLight.coords = Array<number>(GridController.stepSize*(i)+GridController.buffer, width/2);
        GridController.Lights.push(tempHorLight);
    }

    for(let i = 0; i<GridController.gridSize; i++) {
        let tempVertLight: Light = lightFactory(GridController.gridSize+i);
        tempVertLight.coords = Array<number>(width/2, GridController.stepSize*(i)+GridController.buffer);
        
        if(GridController.Lights[i].coords[1] != tempVertLight.coords[1]) {
            GridController.Lights.push(tempVertLight);
        }
    }
}

/**
 * randomly removes lights such that the graph is still continuous
 */
function removeLights() {
    GridController.Lights = shuffle(GridController.Lights);

    //needs while loop with counter and quota
    let counter = GridController.Lights.length-1;
    let quota = Math.floor((1-lightPercentSlider.value()/100)*GridController.Lights.length);
    let removed = 0;

    while(removed < quota && counter >= 0) {

        //REMOVE LIGHT AND NEIGHBORS   
        //Removes from main Lights array
        let tempLight = GridController.Lights[counter];
        let neighbors = tempLight.neighbors;

        //for all neighbors
        for(let j = 0; j < neighbors.length; j++) {
            //remove tempLight as a neighbor
            neighbors[j].neighbors.splice(neighbors[j].neighbors.indexOf(tempLight), 1);

            //loop over all roads
            for(let k = 0; k < neighbors[j].roads.length; k++) {
                //if road entrance or exit is tempLight, remove the road
                if(neighbors[j].roads[k].entrance == tempLight || neighbors[j].roads[k].exit == tempLight) {
                    //removes road from neighbor
                    let removedRoad = neighbors[j].roads.splice(k, 1)[0];

                    //removes road from tempLight
                    tempLight.roads.splice(tempLight.roads.indexOf(removedRoad));

                    //removes from main Road array
                    GridController.Roads.splice(GridController.Roads.indexOf(removedRoad), 1);
                }
            }
        }
        
        //for all neighbors
        if(neighbors.length > 1) {
            let pathsFound = true;
            for(let j = 1; j<neighbors.length; j++) {
                //if a path can't be made between the first neighbor and the j neighbor
                if(!(aStar(neighbors[0], neighbors[j], false).length > 0)) {
                    pathsFound = false;
                    break;
                }
            }

            //if paths not found
            if(!pathsFound) {
                //for all neighbors
                for(let k = 0; k<neighbors.length; k++) {
                    //add tempLight back as a neighbor
                    neighbors[k].neighbors.push(tempLight);

                    //add back road connecting neighbor and removedLight
                    let newTempRoad = roadFactory(tempLight, neighbors[k]);

                    neighbors[k].roads.push(newTempRoad);
                    tempLight.roads.push(newTempRoad);

                    //adds back road to main Road array
                    GridController.Roads.push(newTempRoad);
                }
            }
            //otherwise remove the Light completely
            else{
                GridController.Lights.splice(counter, 1);
                removed++;
            }
        }
        else {
            GridController.Lights.splice(counter, 1);
            removed++;
        }
        counter--;
    }
}

//runs through all lights and starts their cycles
function startLightCounters() {
    for(let i = 0; i<GridController.Lights.length; i++) {
        let tempLight = GridController.Lights[i];
        tempLight.startCycleCreateEventHandler()();
    }
}