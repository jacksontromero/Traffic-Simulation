/**
 * Factory for a car object
 * @param id number
 * @param Light Current Light location or null
 * @param mpg Miles per gallon
 * @param path Path of lights from start to end
 */
function carFactory(id, light, mpg, path) {
    return {
        id: id,
        light: light,
        mpg: mpg,
        path: path,
        pathIndex: 0,
        reRoute: false,
        /**
         * Returns a function that returns the id of the car for testing purposes
         */
        outputCreateEventHandler() {
            return () => {
                return this.id;
            };
        },
        /**
         * Returns a function that returns the next Lane that the car should be on after the next light
         */
        getNextLane() {
            let foundRoad = null;
            //if the current path index isn't the last path index
            if (this.pathIndex != this.path.length - 1) {
                //nextLight = next light in path
                if (this.reRoute) {
                    let tempPath = modifiedAStar(this.path[this.pathIndex], this.path[this.path.length - 1], false);
                    this.path.splice(this.pathIndex);
                    this.path = this.path.concat(tempPath);
                }
                let nextLight = this.path[this.pathIndex + 1];
                //for each road at current light
                for (let i = 0; i < this.light.roads.length; i++) {
                    let tempRoad = this.light.roads[i];
                    //if a road connects this light and the nextLight
                    if ((tempRoad.entrance == this.light && tempRoad.exit == nextLight) || (tempRoad.exit == this.light && tempRoad.entrance == nextLight)) {
                        //we found road
                        foundRoad = tempRoad;
                        break;
                    }
                }
                //for all lanes of the found road
                for (let i = 0; i < foundRoad.lanes.length; i++) {
                    //if that lane connects the current Light we're approaching and the Light we need to reach, we found the lane
                    if (foundRoad.lanes[i].entrance == this.light && foundRoad.lanes[i].exit == nextLight) {
                        this.pathIndex++;
                        return foundRoad.lanes[i];
                    }
                }
            }
            //otherwise return null
            return null;
        },
        /**
         * Returns a function that moves the current car to its next Lane
         */
        moveToLaneCreateEventHandler() {
            return () => {
                let time = GridController.masterTime;
                //when moving to next lane, if last lane exists, remove this car from the last lane's exiting list
                if (this.lane) {
                    this.lane.carsExiting.shift();
                    //if networked
                    if (this.reRoute) {
                        this.lane.allCars--;
                    }
                }
                let tempLane = this.getNextLane();
                //if the next lane exists
                if (tempLane) {
                    if (verbose) {
                        console.log(`moved ${this.id} to lane at ${time}`);
                    }
                    //update coordinates
                    this.coords = [this.light.coords[0] + (tempLane.exit.coords[0] - tempLane.entrance.coords[0]) / 2, this.light.coords[1] + (tempLane.exit.coords[1] - tempLane.entrance.coords[1]) / 2];
                    //clear current light, update next lane
                    this.lane = tempLane;
                    //if networked
                    if (this.reRoute) {
                        this.lane.allCars++;
                    }
                    let travelTime = this.lane.timeToTravel();
                    //Move this car to the next light's queue after it has finished traversing the next lane
                    GridController.masterQueue.enqueue(gridEventFactory(time + travelTime, this.moveToLightQueueCreateEventHandler(), `move ${this.id} to ${this.lane.exit.id}'s queue`));
                }
                //otherwise the car is done and has reached its destination
                else {
                    if (verbose) {
                        console.log(`${this.id} reached destination at ${time}`);
                    }
                    this.completed = true;
                    this.endTime = time;
                    this.coords = this.lane.exit.coords;
                    this.lane = undefined;
                    let resultsArr = GridController.results[this.id];
                    if (!resultsArr) {
                        GridController.results[this.id] = [];
                    }
                    GridController.results[this.id].push(this.endTime);
                    let allFinished = true;
                    for (let i = 0; i < GridController.Cars.length; i++) {
                        if (!GridController.Cars[i].completed) {
                            allFinished = false;
                            break;
                        }
                    }
                    if (allFinished) {
                        testImprovements();
                        GridController.iterate();
                        /*else {
                            console.log(`ALL FINISHED`);
                            console.log(JSON.stringify(GridController.results));
                            paused = true;
                            playPauseButton.elt.innerHTML = 'Play ⏵';
                        }*/
                    }
                }
            };
        },
        /**
         * Returns a function that moves the current car to the light queue if it exists or to the next light
         */
        moveToLightQueueCreateEventHandler() {
            return () => {
                let time = GridController.masterTime;
                //sets the current light as the light we're entering the queue of and add to total distance
                let nextLight = this.lane.exit;
                this.totalDistance += lightDistance(nextLight, this.light);
                this.light = nextLight;
                //if the current lane is active and has no queue
                if (this.lane.active && this.lane.exitQueue.length == 0) {
                    //if no cars are exiting, skip
                    if (this.lane.carsExiting.length == 0) {
                        if (verbose) {
                            console.log(`${this.id} skipped ${this.lane.exit.id}'s queue at ${time}`);
                        }
                        //move car to the next lane after it has finished traversing this light
                        GridController.masterQueue.enqueue(gridEventFactory(time + nextLight.travelTime, this.moveToLaneCreateEventHandler(), `move ${this.id} to lane, skip ${nextLight.id}`));
                    }
                    //else if at least one car is exiting, send this car through intersection after that one
                    else {
                        //IF IT'S JUST THAT A CAR WAS EXITING WHEN THIS CAR ARRIVED, DON'T ENTER IT INTO THE QUEUE BUT DO SEND IT ALONG WITH APPROPRIATE TIMINGS SO IT DOESN'T BACK UP EVERYTHING BEHIND IT
                        //let exitingCar = this.lane.carsExiting[this.lane.carsExiting.length-1];
                        this.lane.carsExiting.push(this);
                        if (verbose) {
                            console.log(`${this.id} skipped ${this.lane.exit.id}'s queue at ${time} (cars already exiting)`);
                        }
                        GridController.masterQueue.enqueue(gridEventFactory(time + nextLight.travelTime + GridController.reactionTime, this.moveToLaneCreateEventHandler(), `move ${this.id} to lane, skip ${nextLight.id} (cars already exiting)`));
                    }
                }
                //else add to exit queue
                else {
                    //adds this car to the exiting list of the current lane
                    this.lane.carsExiting.push(this);
                    this.lane.exitQueue.push(this);
                    if (verbose) {
                        console.log(`moved ${this.id} to ${this.lane.exit.id}'s queue at ${time}`);
                    }
                    //update coords
                    this.coords = [this.lane.entrance.coords[0] + (this.lane.exit.coords[0] - this.lane.entrance.coords[0]) / 1.5, this.lane.entrance.coords[1] + (this.lane.exit.coords[1] - this.lane.entrance.coords[1]) / 1.5];
                    //if the active lane (and opposite lane) is empty and the light is smart, cycle now
                    let tempLight = this.light;
                    let tempActiveLane = tempLight.activeLane;
                    let tempOppositeLane = tempActiveLane.getOpposite();
                    if (tempOppositeLane) {
                        if (tempLight.smartLogic && tempActiveLane.exitQueue.length == 0 && tempOppositeLane.exitQueue.length == 0 && tempLight.currentlySkipping == false) {
                            //CYCLE NOW
                            //remove current light cycle event
                            // let queueIndex = GridController.masterQueue.values.indexOf(tempLight.nextCycleEventObject);
                            // GridController.masterQueue.values.splice(queueIndex, 1);
                            //updates skipCycleAtTime to be the priority of the current nextCycle object
                            tempLight.skipCycleAtTime = tempLight.nextCycleEventObject.priority;
                            if (verbose) {
                                console.log(`SMART SKIP FROM INACTIVE LANE (OPP)`);
                            }
                            tempLight.currentlySkipping = true;
                            let correction = 0;
                            if (tempLight.travelTime + time == tempLight.skipCycleAtTime) {
                                correction = 1;
                            }
                            //add a new light cycle event that cycles immediately
                            tempLight.nextCycleEventObject = gridEventFactory(time + tempLight.travelTime + correction, tempLight.cycleCreateEventHandler(), `immediately cycle light ${tempLight.id}`);
                            GridController.masterQueue.enqueue(tempLight.nextCycleEventObject);
                        }
                    }
                    else {
                        if (tempLight.smartLogic && tempActiveLane.exitQueue.length == 0 && tempLight.currentlySkipping == false) {
                            //CYCLE NOW
                            //remove current light cycle event
                            // let queueIndex = GridController.masterQueue.values.indexOf(tempLight.nextCycleEventObject);
                            // GridController.masterQueue.values.splice(queueIndex, 1);
                            //updates skipCycleAtTime to be the priority of the current nextCycle object
                            tempLight.skipCycleAtTime = tempLight.nextCycleEventObject.priority;
                            if (verbose) {
                                console.log(`SMART SKIP FROM INACTIVE LANE`);
                            }
                            tempLight.currentlySkipping = true;
                            let correction = 0;
                            if (tempLight.travelTime + time == tempLight.skipCycleAtTime) {
                                correction = 1;
                            }
                            //add a new light cycle event that cycles immediately
                            tempLight.nextCycleEventObject = gridEventFactory(time + tempLight.travelTime + correction, tempLight.cycleCreateEventHandler(), `immediately cycle light ${tempLight.id}`);
                            GridController.masterQueue.enqueue(tempLight.nextCycleEventObject);
                        }
                    }
                }
                //WAIT FOR CALL FROM LIGHT TO EXIT QUEUE
            };
        },
        //starts a car object on its path
        start() {
            return () => {
                let time = GridController.masterTime;
                this.startTime = time;
                GridController.masterQueue.enqueue(gridEventFactory(time, this.moveToLaneCreateEventHandler(), `move ${this.id} to lane`));
            };
        },
        startTime: 0,
        endTime: 0,
        coords: [],
        totalDistance: 0,
        completed: false
    };
}
/**
 * Sets up Cars for the GridController
 * @param total number of cars to populate the grid with
 */
function setUpCars(total) {
    GridController.Cars = [];
    //for the specified number
    for (let i = 0; i < total; i++) {
        //console.log(`setup ${i}`);
        //give each car a start and end light that both have 0 neighbors
        let startLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
        let endLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
        //tries 1000 times to find a starting point with only 1 neighbor
        for (let i = 0; i < 1000; i++) {
            if (startLight.neighbors.length == 1) {
                break;
            }
            else {
                startLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
            }
        }
        //tries 1000 times to find an end point with only 1 neighbor
        for (let i = 0; i < 1000; i++) {
            if (endLight.id != startLight.id && endLight.neighbors.length == 1) {
                break;
            }
            else {
                endLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
            }
        }
        //if a suitable endlight could not be found, make sure that it is not equal to the starting light
        while (endLight.id == startLight.id) {
            endLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
        }
        //create car
        let tempCar = carFactory(i, startLight, 30, aStar(startLight, endLight, false));
        //generate coords
        tempCar.coords = startLight.coords;
        //add to GridController list of all Cars
        GridController.Cars[i] = tempCar;
    }
}
function startCars() {
    for (let i = 0; i < GridController.Cars.length; i++) {
        let testCar = GridController.Cars[i];
        GridController.masterQueue.enqueue(gridEventFactory(GridController.masterTime, testCar.start(), "start car"));
    }
}
function testSpeeds() {
    for (let i = 0; i < GridController.Cars.length; i++) {
        let tempCar = GridController.Cars[i];
        if (tempCar.endTime < tempCar.startTime + pathTime(tempCar.path)) {
            throw `car timing error`;
        }
        //console.log(`endTotalTime ${tempCar.endTime-tempCar.startTime} > minTime ${pathTime(tempCar.path)}`);
    }
    console.log(`success!`);
}
function testImprovements() {
    let sum = 0;
    let i;
    for (i = 0; i < GridController.Cars.length; i++) {
        let tempCar = GridController.Cars[i];
        let difference = GridController.results[tempCar.id][GridController.currentIteration - 1] - GridController.results[tempCar.id][0];
        sum += difference;
    }
    console.log(`Average difference between iteration ${GridController.gridIteration} and the original run: ${sum / i}`);
    return sum / i;
}
function generateContinuousCarsCreateEventHandler(delay) {
    return () => {
        if (continuousCars) {
            let startLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
            let endLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
            //tries 1000 times to find a starting point with only 1 neighbor
            for (let i = 0; i < 1000; i++) {
                if (startLight.neighbors.length == 1) {
                    break;
                }
                else {
                    startLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
                }
            }
            //tries 1000 times to find an end point with only 1 neighbor
            for (let i = 0; i < 1000; i++) {
                if (endLight.id != startLight.id && endLight.neighbors.length == 1) {
                    break;
                }
                else {
                    endLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
                }
            }
            //if a suitable endlight could not be found, make sure that it is not equal to the starting light
            while (endLight.id == startLight.id) {
                endLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
            }
            //create car
            let tempCar = carFactory(GridController.Cars.length, startLight, 30, aStar(startLight, endLight, false));
            //generate coords
            tempCar.coords = startLight.coords;
            //add to GridController list of all Cars
            GridController.Cars[GridController.Cars.length] = tempCar;
            GridController.masterQueue.enqueue(gridEventFactory(GridController.masterTime, tempCar.start(), "start continuous car"));
            GridController.masterQueue.enqueue(gridEventFactory(GridController.masterTime + delay, generateContinuousCarsCreateEventHandler(delay), "next continuous car"));
        }
    };
}
function stopContinuousCarsCreateEventHandler() {
    return () => {
        continuousCars = false;
        continuousCarsButton.elt.innerHTML = `Continuous Car Generation ENDED`;
    };
}
//generates a ton of cars all going the same place
function setUpTestCars(total) {
    GridController.Cars = [];
    //give each car a start and end light that both have 0 neighbors
    let startLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
    let endLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
    //tries 1000 times to find a starting point with only 1 neighbor
    for (let i = 0; i < 1000; i++) {
        if (startLight.neighbors.length > 1) {
            startLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
        }
        else {
            break;
        }
    }
    //tries 1000 times to find an end point with only 1 neighbor
    for (let i = 0; i < 1000; i++) {
        if (endLight.id == startLight.id || endLight.neighbors.length > 1) {
            endLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
        }
        else {
            break;
        }
    }
    //if a suitable endlight could not be found, make sure that it is not equal to the starting light
    while (endLight.id == startLight.id) {
        endLight = GridController.Lights[Math.floor(Math.random() * GridController.Lights.length)];
    }
    //for the specified number
    for (let i = 0; i < total; i++) {
        //create car
        let tempCar = carFactory(i, startLight, 30, aStar(startLight, endLight, true));
        //generate coords
        tempCar.coords = startLight.coords;
        //add to GridController list of all Cars
        GridController.Cars[i] = tempCar;
    }
}
function setUpTestCars2(total) {
    GridController.Cars = [];
    let startLight1 = GridController.Lights[0];
    let endLight1 = GridController.Lights[GridController.gridSize - 1];
    let startLight2 = GridController.Lights[GridController.Lights.length - 1];
    let endLight2 = GridController.Lights[GridController.gridSize];
    for (let i = 0; i < total; i += 2) {
        //create car
        let tempCar = carFactory(i, startLight1, 30, aStar(startLight1, endLight1, false));
        //generate coords
        tempCar.coords = startLight1.coords;
        //add to GridController list of all Cars
        GridController.Cars[i] = tempCar;
        let tempCar2 = carFactory(total + i, startLight2, 30, aStar(startLight2, endLight2, false));
        tempCar2.coords = startLight2.coords;
        GridController.Cars[i + 1] = tempCar2;
    }
}
function startTestCars() {
    //let stagger = Math.floor(Math.random()*5+1);
    let stagger = 3;
    for (let i = 0; i < GridController.Cars.length; i++) {
        let testCar = GridController.Cars[i];
        GridController.masterQueue.enqueue(gridEventFactory(GridController.masterTime + stagger * i, testCar.start(), "start car"));
    }
}
function testArrivals() {
    let error = false;
    for (let i = 0; i < GridController.Cars.length - 1; i++) {
        if (GridController.Cars[i].endTime > GridController.Cars[i + 1].endTime) {
            error = true;
        }
    }
    if (error) {
        throw `car arrival error`;
    }
    else {
        console.log(`Success!`);
    }
}
