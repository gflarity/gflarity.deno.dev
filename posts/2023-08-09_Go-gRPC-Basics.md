---
publish_date: 2023-08-09
title: Go gRPC Basics
---

Inspired by [this TutorialEdge video](https://www.youtube.com/watch?v=BdzYdN_Zd9Q&ab_channel=TutorialEdge). I wanted a text version that with essentially the same content. There's a lot sample git repos out there, and instructions for updating the boiler plate. This a Go gRPC Hello World tutorial from scratch.

Install protoc and the rest of the tool chain for using protoc with Go and gRPC.

```sh
brew install protoc
brew install protoc-gen-go
brew install protoc-gen-go-grpc
```

Initialize your new go module:

```sh
go mod init hello_grpc
go get google.golang.org/grpc
```

Create a protocol buffer for this service. Note the `option go_package = "hello_grpc/protos";` which is relatively new vs the the video tutorial above ([reference](https://protobuf.dev/reference/go/go-generated)).

```proto
syntax = "proto3";
package chat;

option go_package = "/chat";

message Message {
  string body = 1;
}

service ChatService {
   rpc SayHello(Message) returns (Message) {}
}

```

Compile/generate the protocol buffer go code:

```ssh
mkdir chat
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=./chat --go-grpc_opt=paths=source_relative \
    chat.proto

# we can see what's been generated using tree
tree chat
chat
├── chat.pb.go
└── chat_grpc.pb.go

1 directory, 2 files
```

Now let's create the service

```sh
go get golang.org/x/net/context
```

Under the chat directory create chat.go:

```go
package chat

import (
	"context"
	"log"
)

type Service struct {

  // This is a requirement of the interface required for registration below.
	UnimplementedChatServiceServer
}

// this matches our proto rpc
func (s *Service) SayHello(ctx context.Context, message *Message) (*Message, error) {
	log.Printf("Message Resceived From Client: %s", message.Body)
	return &Message{Body: "Hello from the server!"}, nil
}

```

Now let's create the server (I chose to put this under server directory).

```go
package main

import (
	"google.golang.org/grpc"
	"hello_grpc/chat"
	"log"
	"net"
)

func main() {
	lis, err := net.Listen("tcp", ":9000")
	if err != nil {
		// Fatalf is equivalent to Printf() followed by a call to os.Exit(1).
		log.Fatalf("failed to listen: %s", err.Error())
	}

	s := grpc.NewServer()

	// the PB code we generated before providers a helper for registeration
	chat.RegisterChatServiceServer(s, &chat.Service{})

	// Under the hood it's just doing the following which seems like a better delegation of responsibility IMHO.
	// However, you are supposed to use the above canonically.
	// s.RegisterService(&chat.ChatService_ServiceDesc, s)

	// Start listening now that the service is registered.  This will block indefinitely. If you want to do something
	// else you'll need to wrap this in a goroutine.
	if err = s.Serve(lis); err != nil {
		log.Fatalf("gRPC server failed to listen: %s", err.Error())
	}

}

```

Now let's create the client (I chose to put this under the client directory):

```go
package main

import (
	"context"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"hello_grpc/chat"
	"log"
)

func main() {

	// make the connection
	conn, err := grpc.Dial(":9000", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Could not connect to gRPC server: %s", err.Error())
	}

	// service client
	c := chat.NewChatServiceClient(conn)
	r, err := c.SayHello(context.Background(), &chat.Message{Body: "Hello from the client!"})
	if err != nil {
		log.Fatalf("Could not say hello: %s", err.Error())
	}
	log.Println(r.Body)

}

```

Putting it all together, you can now run the server:

```sh
go run server.go
```

Then run the client in another terminal:

```sh
go run client.go
```

You should see something similar to

```sh
% go run server.go
<silience>

# in another terminal
% go run client.go
2023/08/09 13:12:12 Hello from the server!

# back in the first terminal
2023/08/09 13:12:12 Message Resceived From Client: Hello from the client!
```

You find the code from above [here](https://github.com/gflarity/hello_grpc).
