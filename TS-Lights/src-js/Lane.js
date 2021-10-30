/**
 * Constructs a Lane object
 * @param entrance Light
 * @param exit Light
 * @param parentRoad Road
 */
function laneFactory(entrance, exit, parentRoad) {
    let direction;
    //determines direction of the lane
    if (exit.coords[0] > entrance.coords[0]) {
        direction = "leftright";
    }
    else if (exit.coords[0] < entrance.coords[0]) {
        direction = "rightleft";
    }
    else if (exit.coords[1] > entrance.coords[1]) {
        direction = "updown";
    }
    else if (exit.coords[1] < entrance.coords[1]) {
        direction = "downup";
    }
    else {
        throw 'no direction detected';
    }
    return {
        entrance: entrance,
        exit: exit,
        parentRoad: parentRoad,
        length: lightDistance(entrance, exit),
        carsExiting: [],
        entranceQueue: [],
        exitQueue: [],
        allCars: 0,
        active: false,
        direction: direction,
        alwaysActive: false,
        speedLimit: 35,
        /**
         * Returns how long it takes to traverse a lane at a given speed
         * @param speed Speed of travel
         */
        timeToTravel() {
            let distance = this.length * gridScale; //MILES
            let time = distance / (this.speedLimit / 60 / 60);
            return time;
        },
        /**
         * Returns the Lane opposite of the current lane
         */
        getOpposite() {
            //if the lane is horizontal
            if (this.entrance.coords[1] == this.exit.coords[1]) {
                //for the exit's roads
                for (let i = 0; i < this.exit.roads.length; i++) {
                    //for a road's lanes
                    let tempRoad = this.exit.roads[i];
                    for (let j = 0; j < tempRoad.lanes.length; j++) {
                        let tempLane = tempRoad.lanes[j];
                        //if the lanes are parallel and opposite directions
                        if (tempLane.exit == this.exit && tempLane.entrance.coords[1] == this.entrance.coords[1] && tempLane != this) {
                            return tempLane;
                        }
                    }
                }
            }
            //if the lane is vertical
            else {
                for (let i = 0; i < this.exit.roads.length; i++) {
                    //for a road's lanes
                    let tempRoad = this.exit.roads[i];
                    for (let j = 0; j < tempRoad.lanes.length; j++) {
                        let tempLane = tempRoad.lanes[j];
                        //if the lanes are parallel and opposite directions
                        if (tempLane.exit == this.exit && tempLane.entrance.coords[0] == this.entrance.coords[0] && tempLane != this) {
                            return tempLane;
                        }
                    }
                }
            }
            return null;
        }
    };
}
/**
 * Generates two lanes on top of existing Roads, each in opposite directions
 */
function generateLanes() {
    clearLanes();
    //For each road, push two lanes with entrances and exits swapped
    for (let i = 0; i < GridController.Roads.length; i++) {
        let tempRoad = GridController.Roads[i];
        //Clears any already existing lanes
        tempRoad.lanes = [];
        //constructs one Lane 
        let lane1 = laneFactory(tempRoad.entrance, tempRoad.exit, tempRoad);
        tempRoad.lanes.push(lane1);
        tempRoad.exit.incomingLanes.push(lane1);
        //constructs second lane going the opposite direction
        let lane2 = laneFactory(tempRoad.exit, tempRoad.entrance, tempRoad);
        GridController.Roads[i].lanes.push(lane2);
        tempRoad.entrance.incomingLanes.push(lane2);
    }
}
/**
 * Clears all existing lanes
 */
function clearLanes() {
    //For each road, clear its lanes
    for (let i = 0; i < GridController.Roads.length; i++) {
        let tempRoad = GridController.Roads[i];
        tempRoad.lanes = [];
    }
}
