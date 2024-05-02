FROM alpine

# Install nodejs 
RUN apk add --update bash npm python3 make g++ 

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package.json /app

# Install app dependencies
RUN npm install

# Bundle app source
COPY . /app

# Expose the port
EXPOSE 5000 5000

# Build the app
RUN npm run build

# create user named coder
RUN adduser -D coder

# make it default user
USER coder

# Start the app
CMD ["npm","run", "start"]
