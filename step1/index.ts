import * as docker from "@pulumi/docker";

// This program encodes a complete application: a container running Redis Commander,
// and a container running Redis. Redis Commander connects directly with Redis.
//
// In order for the two containers to communicate directly, they must be placed in the
// same network. Before creating the containers themselves, we first create the network
// that will contain both of them.
const network = new docker.Network("net");

// Also before creating a container, we must first obtain a "RemoteImage", which is a reference to an external image
// that is downloaded to the local machine. In this case, we're referring to an image on Docker Hub.
const redisImage = new docker.RemoteImage("redis-image", {
    name: "redis:latest",
    keepLocally: true, // don't delete the image from the local machine when deleting this resource.
});

// We can create a container using a reference to the name of the image we just downloaded and a reference to the name
// of the network that this container should use.
const redisContainer = new docker.Container("redis", {
    image: redisImage.name,
    networksAdvanced: [{ name: network.name }],
    restart: "on-failure",
});

// We do the same thing for the Redis Commander container.
const redisCommanderImage = new docker.RemoteImage("redis-commander-image", {
    name: "rediscommander/redis-commander:latest",
    keepLocally: true,
});

const redisCommanderContainer = new docker.Container("redis-commander", {
    image: redisCommanderImage.name,
    restart: "on-failure",
    networksAdvanced: [{ name: network.name }],
    envs: [
        // Pulumi resources have "output" properties, which are properties that are set upon successful completion of
        // the resource operation. These "outputs" are like promises - they can't be used directly but instead must be
        // manipulated through use of the `apply` function.
        //
        // Here, we are using the name of the Redis commander to build an environment variable `REDIS_HOST` that points
        // to the network identity of the Redis container we just created.
        redisContainer.name.apply(name => `REDIS_HOST=${name}`),
    ],
    // Finally, we expose some ports. Redis Commander listens on port 8081, so we'll map that to external
    // port 3001 for easy consumption on the user machine.
    ports: [{
        internal: 8081,
        external: 3000,
    }]
});

// Finally, we'll expose the Redis Commander container name and endpoint as outputs of this stack.
const redisCommanderEndpoint = redisCommanderContainer.ports.apply(p => `http://localhost:${p![0].external}`);
export const appName = redisCommanderContainer.name;
export const host = redisCommanderEndpoint;
