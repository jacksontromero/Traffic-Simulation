//A Road object represents a connection between two Lights on the Grid
//A Road is also used in the AStar pathfinder
/**
 * Interface for a Road object
 */
interface Road {
    entrance: Light;
    exit: Light;
    length?: number;
    lanes?: Lane[];
}

/**
 * Constructs a Road interface with default values
 * @param entrance Light object for one end of road
 * @param exit Light object for other end of road
 */
function roadFactory(entrance: Light, exit: Light): Road {
    return {
        entrance: entrance,
        exit: exit,
        length: lightDistance(entrance, exit),
        lanes: []
    }
}

/**
 * Generates all roads, then removes lights that aren't connected to anything and roads randomly
 */
function generateRoads() {

    //clears road array
    GridController.Roads = [];

    //clears neighbors of all lights
    for(let i = 0; i < GridController.Lights.length; i++) {
        GridController.Lights[i].neighbors.splice(0, GridController.Lights[i].neighbors.length);
    }

    //for all lights, check all other lights
    for(let i = GridController.Lights.length-1; i>=0 ; i--) {
        for(let j = 0; j<GridController.Lights.length; j++) {
            if(j!=i) {
                //if distance < threshold, then generate roads and neighbors
                let distance = calculateDistance(GridController.Lights[i].coords[0], GridController.Lights[i].coords[1], GridController.Lights[j].coords[0], GridController.Lights[j].coords[1]);
                if(distance < GridController.stepSize+5) {
                    if(!GridController.Lights[i].neighbors.includes(GridController.Lights[j])) {

                            let tempRoad = roadFactory(GridController.Lights[i], GridController.Lights[j]);

                            GridController.Roads.push(tempRoad);

                            GridController.Lights[i].neighbors.push(GridController.Lights[j]);
                            GridController.Lights[i].roads.push(tempRoad);

                            GridController.Lights[j].neighbors.push(GridController.Lights[i]);
                            GridController.Lights[j].roads.push(tempRoad);
                    }
                }
            }
        }

        //if a light has no roads then remove it
        if(GridController.Lights[i].roads.length == 0) {
            GridController.Lights.splice(i, 1);
        }
    }

    
}

/**
 * removes roads randomly
 */
function removeRoads() {
    //randomizes roads (uses p5.js shuffle function)
    GridController.Roads = shuffle(GridController.Roads);

    let quota = Math.floor((1-roadPercentSlider.value()/100)*GridController.Roads.length);
    let removed = 0;
    let counter = GridController.Roads.length-1;

    //while quota not met and there are still Roads left to try
    while(removed < quota && counter >= 0) {
        //removes road as a neighbor of its connected lights
        let tempRoad = GridController.Roads[counter];

        //if the entrance and exit will have at least 1 road after removing this one
        if(tempRoad.entrance.roads.length > 1 && tempRoad.exit.roads.length > 1) {

            //removes road from its connected lights
            tempRoad.entrance.roads.splice(tempRoad.entrance.roads.indexOf(tempRoad), 1);
            tempRoad.exit.roads.splice(tempRoad.exit.roads.indexOf(tempRoad), 1);

            //removes Lights as each others neighbors
            tempRoad.entrance.neighbors.splice(tempRoad.entrance.neighbors.indexOf(tempRoad.exit), 1);
            tempRoad.exit.neighbors.splice(tempRoad.exit.neighbors.indexOf(tempRoad.entrance), 1);

            //runs aStar between entrance and exit of the now deleted road, finds alternate path
            if(aStar(tempRoad.entrance, tempRoad.exit, false).length > 0) {
                GridController.Roads.splice(counter, 1);
                removed++;
            }

            //if no path found, bring the road back
            else {
                //reinstates Road and neighbors
                tempRoad.entrance.roads.push(tempRoad);
                tempRoad.exit.roads.push(tempRoad);

                tempRoad.entrance.neighbors.push(tempRoad.exit);
                tempRoad.exit.neighbors.push(tempRoad.entrance);
            }
        }

        //increment counter
        counter--;
    }
}