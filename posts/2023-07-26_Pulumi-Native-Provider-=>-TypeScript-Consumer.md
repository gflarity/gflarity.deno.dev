---
publish_date: 2023-07-26
title: Pulumi Native Provider => TypeScript Consumer
---

# Pulumi Native Provider => TypeScript Consumer

In this posting I document:

1. How do create a (very basic) Native Pulumi Provider (go)
2. How do use said provider locally with TypeScript (Node.js)

First things first, let's create a new go repo (with mod)

```sh
mkdir hello_pulumi_go
cd hello_pulumi_go

# go module init
go mod init hello_pulumi_go

# install the pulumi-go-provider boiler plate
go get github.com/pulumi/pulumi-go-provider
touch main.go
```

Here's what main.go should look like:

```go
package main

import (
	"fmt"
	p "github.com/pulumi/pulumi-go-provider"
	"github.com/pulumi/pulumi-go-provider/infer"
	"strings"
)

func main() {
	p.RunProvider("hello-pulumi-go", "1.0.0",
		// We tell the provider what resources it needs to support.
		// In this case, a single custom resource.
		infer.Provider(infer.Options{
			Resources: []infer.InferredResource{
				infer.Resource[HelloWorld, HelloWorldArgs, HelloWorldState](),
			},
		}))
}

// HelloWorld is the controlling struct for the resource.
type HelloWorld struct{}

// HelloWorldArgs is the input struct, defining the inputs to necessary to creat the resource.
type HelloWorldArgs struct {
	// Fields projected into Pulumi must be public and hava a `pulumi:"..."` tag.
	// The pulumi tag doesn't need to match the field name, but it's generally a
	// good idea.
	Name string `pulumi:"name"`
	// Fields marked `optional` are optional, so they should have a pointer
	// ahead of their type.
	Loud *bool `pulumi:"loud,optional"`
}

// HelloWorldState is the resource state, it describes the fields that exist on the created resource (outputs).
type HelloWorldState struct {
	// It is generally a good idea to embed args in outputs, but it isn't strictly necessary.
	HelloWorldArgs
	// Here we define a required output called message.
	Message string `pulumi:"message"`
}

// Create is responsible for performing the external actions representative of creating this resource. All resources must implement Create at a minumum.
func (HelloWorld) Create(ctx p.Context, name string, input HelloWorldArgs, preview bool) (string, HelloWorldState, error) {
	state := HelloWorldState{HelloWorldArgs: input}
	if preview {
		return name, state, nil
	}
	state.Message = fmt.Sprintf("Hello, %s", input.Name)
	if input.Loud != nil && *input.Loud {
		state.Message = strings.ToUpper(state.Message)
	}
	return name, state, nil
}
```

Let's build this native provider, install then, then generate the sdk's for the various languages Pulumi supports:

```sh
go build
pulumi plugin install resource hello-pulumi-go v1.0.0 -f ./hello_pulumi_go
pulumi package gen-sdk -o ./sdk/ ./hello_pulumi_go
```

Let's try it out using the TypeScript:

```sh
cd sdk/nodejs
```

Now edit your package.json like so. Note that I've removed the install script which assumes that you've published your resource provider publicly. We've already installed the plugin locally by hand.

```JSON
{
    "name": "hello-pulumi-go",
    "version": "1.0.0",
    "scripts": {
        "build": "tsc"
    },
    "dependencies": {
        "@pulumi/pulumi": "^3.42.0"
    },
    "devDependencies": {
        "@types/node": "^14",
        "typescript": "^4.3.5"
    },
    "pulumi": {
        "resource": true,
        "name": "hello-pulumi-go"
    }
}
```

Next up, let's build the generated typescript:

```sh
npm install
npm run build
```

In order to use this nodejs module locally, you'll need to copy the package.json into the ./bin/ directory

```sh
cp package.json ./bin/
```

We're now ready to use it! Let's create a new pulumi project (and stack)

```sh
cd ../../typescript_example
pulumi new typescript
```

Now let's edit the the index.ts to look like so:

```TypeScript
import * as pulumi from "@pulumi/pulumi";
import { HelloWorld } from "../sdk/nodejs/bin";

const helloworld = new HelloWorld("helloworld", { name: "world!" });
export const greeting = helloworld.message;
```

Give it a whirl!

```sh
pulumi up
```

You should get the following:

```sh
(base) geoff@geoffreys-mbp typescript_example % pulumi up
Enter your passphrase to unlock config/secrets
    (set PULUMI_CONFIG_PASSPHRASE or PULUMI_CONFIG_PASSPHRASE_FILE to remember):
Previewing update (dev):
     Type                                 Name                 Plan
 +   pulumi:pulumi:Stack                  hello_pulumi_go-dev  create
 +   └─ hello-pulumi-go:index:HelloWorld  helloworld           create


Resources:
    + 2 to create

Do you want to perform this update? yes
Updating (dev):
     Type                                 Name                 Status
 +   pulumi:pulumi:Stack                  hello_pulumi_go-dev  created (0.20s)
 +   └─ hello-pulumi-go:index:HelloWorld  helloworld           created (0.00s)


Outputs:
    greeting: "Hello, world!"

Resources:
    + 2 created

Duration: 1s
```

You can find the source code for this post available at [https://github.com/gflarity/hello_pulumi_go](https://github.com/gflarity/hello_pulumi_go).

This post was based on the following official Pulumi sources:

- https://www.pulumi.com/blog/pulumi-go-boilerplate-v2/
- https://github.com/pulumi/pulumi-go-provider
