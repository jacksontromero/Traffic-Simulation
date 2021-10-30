# Traffic-Simulation
PJAS 2021 Project on Measuring Impact of Autonomous Systems on Congestion (Won Best CS Project)

This project aimed to create a traffic grid simulation that could be tweaked so that cars knew each other's locations and could dynamically re-route themselves as well as testing the use of smart traffic lights that weren't stuck on a fixed cycle and could change to allow more throughput.

Each link below can be started with the following commands

* First, press the "Setup Everything" button and then press play
* The following will then happen:
    * Cars will be generated and begin to move to their destinations
    * After 10 minutes in the simulation, no new cars will be spawned
    * After all cars have reached their destination, the simulation is run again but with the cars or lights or both having their "smart" functionality enabled
    * Average improvements are printed to the terminal, and then another grid is started with the improvements turned off now
    * Repeat

## The four folders run simulations with slightly different parameters:

### TS-Cars
Runs the simulation with the cars networked and talking to each other so they can take longer routes in order to avoid congestion

Click [here](https://rawcdn.githack.com/jacksontromero/Traffic-Simulation/b2f2628e57c273036aaa1ebd3329c0a9519ea47c/TS-Cars/tsIndex.html) to play around with this version

### TS-Lights
Runs the simulation with the lights dynamically switching so that the most cars can pass through in the same amount of time

Click [here](https://rawcdn.githack.com/jacksontromero/Traffic-Simulation/b2f2628e57c273036aaa1ebd3329c0a9519ea47c/TS-Lights/tsIndex.html) to play around with this version


### TS-Lights-Cars
Runs the simulation with both the networked cars and the smart lights

Click [here](https://rawcdn.githack.com/jacksontromero/Traffic-Simulation/b2f2628e57c273036aaa1ebd3329c0a9519ea47c/TS-Lights-Cars/tsIndex.html) to play around with this version
