# Use a full-featured Debian base to get QEMU dependencies
FROM node:18-bullseye  

WORKDIR /app

# Install QEMU
RUN apt-get update && apt-get install -y \
    qemu-system-x86 \
    qemu-utils \
    && rm -rf /var/lib/apt/lists/*

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the backend source code
COPY . .

# Expose the Node.js API port
EXPOSE 3001

# Expose the VNC port range for QEMU VMs (for other containers on the network)
EXPOSE 5900-5950

# Run the server
CMD ["node", "server.js"]