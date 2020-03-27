## Classes

<dl>
<dt><a href="#Approval">Approval</a></dt>
<dd><p>manual approval action in the pipeline</p></dd>
<dt><a href="#CodeBuild">CodeBuild</a></dt>
<dd><p>manual approval action in the pipeline</p></dd>
<dt><a href="#DockerBuild">DockerBuild</a></dt>
<dd><p>&quot;docker build&quot; convenience action</p></dd>
<dt><a href="#DockerRun">DockerRun</a></dt>
<dd><p>&quot;docker run&quot; convenience action</p></dd>
<dt><a href="#Loader">Loader</a></dt>
<dd><p>fault tolerant multi document YAML loader</p></dd>
<dt><a href="#Parser">Parser</a></dt>
<dd><p>mu.yml parser</p>
<p>this class glues all the components for the parser together</p></dd>
<dt><a href="#PreProcessor">PreProcessor</a></dt>
<dd><p>mu.yml template pre processor</p>
<p>internally this class sets up a custom Nunjucks Environment with useful
helper functions and processes input Nunjucks templates</p></dd>
<dt><a href="#Container">Container</a></dt>
<dd><p>a construct abstracting a single Dockerfile. This class does not participate
in authentication, building, or pushing the actual image of the container.</p></dd>
<dt><a href="#Database">Database</a></dt>
<dd><p>Database provider for service constructs</p></dd>
<dt><a href="#Network">Network</a></dt>
<dd><p>ECS Cluster and VPC</p></dd>
<dt><a href="#Service">Service</a></dt>
<dd><p>ECS service construct</p></dd>
<dt><a href="#Storage">Storage</a></dt>
<dd><p>Storage provider for service constructs</p></dd>
</dl>

## Functions

<dl>
<dt><a href="#nunjucks_env_global">nunjucks_env_global(name)</a> ⇒</dt>
<dd><p>global env function of our Nunjucks Environment</p></dd>
<dt><a href="#nunjucks_cmd_global">nunjucks_cmd_global(command)</a> ⇒</dt>
<dd><p>global cmd function of our Nunjucks Environment</p></dd>
</dl>

<a name="Approval"></a>

## Approval
<p>manual approval action in the pipeline</p>

**Kind**: global class  
<a name="Approval+action"></a>

### approval.action()
<p>creates a manual approval action in the pipeline</p>

**Kind**: instance method of [<code>Approval</code>](#Approval)  
<a name="CodeBuild"></a>

## CodeBuild
<p>manual approval action in the pipeline</p>

**Kind**: global class  
<a name="CodeBuild+action"></a>

### codeBuild.action()
<p>creates a manual approval action in the pipeline</p>

**Kind**: instance method of [<code>CodeBuild</code>](#CodeBuild)  
<a name="DockerBuild"></a>

## DockerBuild
<p>&quot;docker build&quot; convenience action</p>

**Kind**: global class  
<a name="DockerRun"></a>

## DockerRun
<p>&quot;docker run&quot; convenience action</p>

**Kind**: global class  
<a name="Loader"></a>

## Loader
<p>fault tolerant multi document YAML loader</p>

**Kind**: global class  
<a name="Loader+load"></a>

### loader.load(input)
<p>Loads a multi-document YAML string into JSON objects. This method is fault
tolerant and does not throw if one of the documents fail to load. Returns
only successfully loaded ones.</p>

**Kind**: instance method of [<code>Loader</code>](#Loader)  

| Param | Description |
| --- | --- |
| input | <p>a multi-document YAML string</p> |

<a name="Parser"></a>

## Parser
<p>mu.yml parser</p>
<p>this class glues all the components for the parser together</p>

**Kind**: global class  
<a name="Parser+parse"></a>

### parser.parse(input)
<p>parses the input mu.yml string</p>

**Kind**: instance method of [<code>Parser</code>](#Parser)  

| Param | Description |
| --- | --- |
| input | <p>mu.yml as a string</p> |

<a name="PreProcessor"></a>

## PreProcessor
<p>mu.yml template pre processor</p>
<p>internally this class sets up a custom Nunjucks Environment with useful
helper functions and processes input Nunjucks templates</p>

**Kind**: global class  
**Todo**

- [ ] implement the "ssm" Nunjucks global function
- [ ] implement the "asm" Nunjucks global function


* [PreProcessor](#PreProcessor)
    * [new PreProcessor(context)](#new_PreProcessor_new)
    * [.context](#PreProcessor+context) ⇒ <code>object</code>
    * [.render(input)](#PreProcessor+render) ⇒

<a name="new_PreProcessor_new"></a>

### new PreProcessor(context)

| Param | Description |
| --- | --- |
| context | <p>additional context variables given to Nunjucks</p> |

<a name="PreProcessor+context"></a>

### preProcessor.context ⇒ <code>object</code>
**Kind**: instance property of [<code>PreProcessor</code>](#PreProcessor)  
**Returns**: <code>object</code> - <p>build context of preprocessor</p>  
<a name="PreProcessor+render"></a>

### preProcessor.render(input) ⇒
<p>renders the input string template through our Nunjucks Environment</p>

**Kind**: instance method of [<code>PreProcessor</code>](#PreProcessor)  
**Returns**: <p>processed template</p>  

| Param | Description |
| --- | --- |
| input | <p>unprocessed input template string</p> |

<a name="Container"></a>

## Container
<p>a construct abstracting a single Dockerfile. This class does not participate
in authentication, building, or pushing the actual image of the container.</p>

**Kind**: global class  

* [Container](#Container)
    * [.loginCommand](#Container+loginCommand) ⇒
    * [.buildCommand](#Container+buildCommand) ⇒
    * [.pushCommand](#Container+pushCommand) ⇒
    * [.getImageUri(caller)](#Container+getImageUri)
    * [.runCommand()](#Container+runCommand) ⇒

<a name="Container+loginCommand"></a>

### container.loginCommand ⇒
**Kind**: instance property of [<code>Container</code>](#Container)  
**Returns**: <p>shell command containing &quot;docker login&quot;</p>  
<a name="Container+buildCommand"></a>

### container.buildCommand ⇒
**Kind**: instance property of [<code>Container</code>](#Container)  
**Returns**: <p>shell command containing &quot;docker build&quot;</p>  
<a name="Container+pushCommand"></a>

### container.pushCommand ⇒
**Kind**: instance property of [<code>Container</code>](#Container)  
**Returns**: <p>shell command containing &quot;docker push&quot;</p>  
<a name="Container+getImageUri"></a>

### container.getImageUri(caller)
<p>Get the container image's URI for use in ECS. Optionally caller can be used
to get a portable URI independent of the stack building this container with
a precondition that caller exists in the same AWS region and account.</p>

**Kind**: instance method of [<code>Container</code>](#Container)  

| Param | Description |
| --- | --- |
| caller | <p>optional construct in a different stack needing to access the image URI without referencing the stack that is building the container.</p> |

<a name="Container+runCommand"></a>

### container.runCommand() ⇒
**Kind**: instance method of [<code>Container</code>](#Container)  
**Returns**: <p>shell command containing &quot;docker run&quot;</p>  
<a name="Database"></a>

## Database
<p>Database provider for service constructs</p>

**Kind**: global class  
<a name="new_Database_new"></a>

### new Database(scope, id, props)

| Param | Description |
| --- | --- |
| scope | <p>CDK construct scope</p> |
| id | <p>CDK construct ID</p> |
| props | <p>database configuration</p> |

<a name="Network"></a>

## Network
<p>ECS Cluster and VPC</p>

**Kind**: global class  
<a name="Service"></a>

## Service
<p>ECS service construct</p>

**Kind**: global class  
<a name="new_Service_new"></a>

### new Service(scope, id, props)

| Param | Description |
| --- | --- |
| scope | <p>CDK construct scope</p> |
| id | <p>CDK construct ID</p> |
| props | <p>service configuration</p> |

<a name="Storage"></a>

## Storage
<p>Storage provider for service constructs</p>

**Kind**: global class  
<a name="new_Storage_new"></a>

### new Storage(scope, id, props)

| Param | Description |
| --- | --- |
| scope | <p>CDK construct scope</p> |
| id | <p>CDK construct ID</p> |
| props | <p>storage configuration</p> |

<a name="nunjucks_env_global"></a>

## nunjucks\_env\_global(name) ⇒
<p>global env function of our Nunjucks Environment</p>

**Kind**: global function  
**Returns**: <p>environment variable value, empty string if not found</p>  

| Param | Description |
| --- | --- |
| name | <p>environment variable name</p> |

<a name="nunjucks_cmd_global"></a>

## nunjucks\_cmd\_global(command) ⇒
<p>global cmd function of our Nunjucks Environment</p>

**Kind**: global function  
**Returns**: <p>string output of the executed command the output is trimmed
from whitespace and newlines (trailing newline as well)</p>  

| Param | Description |
| --- | --- |
| command | <p>shell command execute. can contain shell operators</p> |

