class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.objects = [];
        this.frame = 0;

        setInterval(() => {

            this.render();

        }, 1000 / 60);

        Input.createListeners(canvas);
    }

    update() {
        for (const obj of this.objects) {
            let time = 1 / 60;

            let nextX = obj.position.x + obj.velocity.x * time;
            let nextY = obj.position.y + obj.velocity.y * time;

            if (obj.collidesAt({
                    x: nextX,
                    y: nextY
                })) {
                while (obj.collidesAt({
                        x: nextX,
                        y: obj.position.y
                    })) {
                    nextX = moveTowards(nextX, obj.position.x, 1);
                }
                while (obj.collidesAt({
                        x: obj.position.x,
                        y: nextY
                    })) {
                    nextY = moveTowards(nextY, obj.position.y, 1);
                }
            }

            obj.position.x = nextX;
            obj.position.y = nextY;

            obj.velocity.x += obj.acceleration.x * time;
            obj.velocity.y += obj.acceleration.y * time;

            obj.velocity.x = moveTowards(obj.velocity.x, 0, obj.drag.x * time);
            obj.velocity.y = moveTowards(obj.velocity.y, 0, obj.drag.y * time);

            obj.acceleration.x = moveTowards(obj.acceleration.x, 0, obj.deceleration.x * time);
            obj.acceleration.y = moveTowards(obj.acceleration.y, 0, obj.deceleration.y * time);

            obj.velocity.x = moveTowards(obj.velocity.x, 0, obj.drag.x * Math.pow(obj.velocity.x, 2) / (2 * obj.mass) * time);
            obj.velocity.y = moveTowards(obj.velocity.y, 0, obj.drag.y * Math.pow(obj.velocity.y, 2) / (2 * obj.mass) * time);

            if (this.frame % Math.round((1 / obj.sprite.speed) / time) === 0) {
                obj.sprite.next();
            }

            obj.velocity.x = moveTowards(obj.velocity.x, 0, obj.friction.x * 9.82 * obj.mass);
            obj.velocity.y = moveTowards(obj.velocity.y, 0, obj.friction.y * 9.82 * obj.mass);

            obj.Update();
        }
        Input.Update();
        this.frame++;
    }

    render() {
        this.update();

        var ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.objects.sort(function(a, b){return a.depth-b.depth});
        for (const obj of this.objects) {
            if (obj.sprite) {
                let bound = obj.sprite.image.getBoundingClientRect();
                if (obj.position.x < this.canvas.offsetWidth && obj.position.x + bound.width > 0 &&
                    obj.position.y < this.canvas.offsetHeight && obj.position.y + bound.height > 0) {
                    ctx.drawImage(
                        obj.sprite.image, // Image
                        obj.sprite.bounds.x, // Crop X
                        obj.sprite.bounds.y, // Crop Y
                        obj.sprite.bounds.width, // Crop Width
                        obj.sprite.bounds.height, // Crop Height
                        obj.position.x, // Position X
                        obj.position.y, // Position Y
                        obj.sprite.bounds.width * obj.scale.x, // Width
                        obj.sprite.bounds.height * obj.scale.y // Height
                    );
                }
            }
        }
    }

    instantiate(object) {
        object.engine = this;
        this.objects.push(object);
        object.Start();
    }

    destroy(object) {
        var index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
        object.Destroy();
    }
}

class Object {
    constructor(sprite) {
        this.position = {
            x: 0,
            y: 0
        };
        this.rotation = 0;
        this.velocity = {
            x: 0,
            y: 0
        };
        this.acceleration = {
            x: 0,
            y: 0
        };
        this.deceleration = {
            x: 0,
            y: 0
        };
        this.drag = {
            x: 0,
            y: 0
        };
        this.scale = {
            x: 1,
            y: 1
        };
        this.mass = 1;
        this.friction = {
            x: 0,
            y: 0
        }

        this.depth = 0;

        this.sprite = sprite;

        let bound = sprite.bounds;
        this.sprite.image.addEventListener("load", () => {
            bound = sprite.bounds;
            
            if(this.collider == null) {
                this.collider = {
                    x: 0,
                    y: 0,
                    width: bound.width,
                    height: bound.height
                };
            }
        })
        this.nullCollider = {
            x: 0,
            y: 0,
            width: bound.width,
            height: bound.height
        };
    }

    getCollidingObjects() {
        let collidingObjects = [];
        for (const other of this.engine.objects) {
            if (other == this) continue;

            let c = this.getColliderOffset();
            let oc = other.getColliderOffset();
            if (c.left <= oc.right && c.right >= oc.left) {
                if (c.bottom >= oc.top && c.top <= oc.bottom) {
                    collidingObjects.push(other);
                }
            }
        }
        return collidingObjects;
    }

    collidesAt(position) {
        for (const other of this.engine.objects) {
            if (other == this) continue;

            let c = this.getColliderAt(position);
            let oc = other.getColliderOffset();
            if (c.left <= oc.right && c.right >= oc.left) {
                if (c.bottom >= oc.top && c.top <= oc.bottom) {
                    return true;
                }
            }
        }
        return false;
    }

    getCenter() {
        if (!this.sprite) return {
            x: 0,
            y: 0
        };
        let bound = this.sprite.bounds;
        return {
            x: bound.width * this.scale.x / 2,
            y: bound.height * this.scale.x / 2
        };
    }

    getCollider() {
        let collider;
        if(this.collider === null) {
            collider = clone(this.nullCollider);
        }
        else {
            collider = clone(this.collider);
        }
        collider.x *= this.scale.x;
        collider.y *= this.scale.y;
        collider.width *= this.scale.x;
        collider.height *= this.scale.y;

        return collider;
    }

    setSprite(sprite, retainCollider) {
        if (!retainCollider) {
            let bound = sprite.image.getBoundingClientRect();
            console.log(bound)
            this.collider = {
                x: 0,
                y: 0,
                width: bound.width,
                height: bound.height
            };
        }
        this.sprite = sprite;
    }

    getColliderOffset() {
        let offset = this.getCollider();
        offset.x += this.position.x;
        offset.y += this.position.y;
        offset.left = offset.x;
        offset.top = offset.y;
        offset.right = offset.x + offset.width;
        offset.bottom = offset.y + offset.height;

        return offset;
    }

    getColliderAt(position) {
        let offset = this.getCollider();
        offset.x += position.x;
        offset.y += position.y;
        offset.left = offset.x;
        offset.top = offset.y;
        offset.right = offset.x + offset.width;
        offset.bottom = offset.y + offset.height;

        return offset;
    }

    getCenterOffset() {
        let offset = this.getCenter();
        return {
            x: this.position.x + offset.x,
            y: this.position.y + offset.y
        };
    }

    Start() {

    }

    Update() {

    }

    Destroy() {

    }
}


let Input = {
    mousePosition: {
        x: 0,
        y: 0
    },
    mouse: [],
    lastMouse: [],

    keyboard: {},
    lastKeyboard: {},

    mouseButtonDown(button) {
        return this.mouse[button] && !this.lastMouse[button];
    },

    mouseButtonUp(button) {
        return !this.mouse[button] && this.lastMouse[button];
    },

    mouseButton(button) {
        return this.mouse[button];
    },

    keyDown(key) {
        if (!this.keyboard.hasOwnProperty(key)) return false;
        return this.keyboard[key] && !this.lastKeyboard[key];
    },

    keyUp(key) {
        if (!this.keyboard.hasOwnProperty(key)) return false;
        return !this.keyboard[key] && this.lastKeyboard[key];
    },

    key(key) {
        if (!this.keyboard.hasOwnProperty(key)) return false;
        return this.keyboard[key];
    },

    mousePosition() {
        return clone(this.mousePosition);
    },

    Update() {
        this.lastMouse = clone(this.mouse);
        this.lastKeyboard = clone(this.keyboard);
    },

    createListeners(canvas) {
        canvas.addEventListener("mousemove", (event) => {
            this.mousePosition.x = event.clientX - canvas.getBoundingClientRect().left;
            this.mousePosition.y = event.clientY - canvas.getBoundingClientRect().top;

            event.stopPropagation();
        });

        canvas.addEventListener("mousedown", (event) => {
            this.mouse[event.which - 1] = true;
            event.stopPropagation();
        });

        canvas.addEventListener("mouseup", (event) => {
            this.mouse[event.which - 1] = false;
            event.stopPropagation();
        });

        document.addEventListener("keydown", (event) => {
            this.keyboard[event.key] = true;
            event.stopPropagation();
        });

        document.addEventListener("keyup", (event) => {
            this.keyboard[event.key] = false;
            event.stopPropagation();
        });
    }
}

class SpriteSheet {
    constructor(name, columns) {
        var el = document.body.appendChild(document.createElement("img"));
        el.src = name;
        el.classList.add("hidden");
        console.log(el);

        this.image = el;
        this.columns = columns;
        this.columnAmount;

        this.bounds = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };

        this.width = this.image.getBoundingClientRect().width;
        this.height = this.image.getBoundingClientRect().height;

        this.setIndex(2);

        this.image.addEventListener("load", () => {
            console.log(this.image.getBoundingClientRect())
            this.width = this.image.getBoundingClientRect().width;
            this.height = this.image.getBoundingClientRect().height;

            this.setIndex(2);
        })

        this.speed = 60;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    setIndex(index) {
        this.index = index % (this.columns);

        this.bounds.y = 0;
        this.bounds.x = (this.width / this.columns) * (index - 1);
        this.bounds.width = this.width / this.columns;
        this.bounds.height = this.height;
    }

    next() {
        this.setIndex(this.index + 1);
    }

    previous() {
        this.setIndex(this.index - 1);
    }
}


function moveTowards(value, target, amount) {
    if (value > target) {
        if (value - amount < target) return target;
        else return value - amount;
    } else if (value < target) {
        if (value + amount > target) return target;
        else return value + amount;
    }
    return target;
}



function $(query) {
    return document.querySelector(query);
}

function clone(obj) {
    let newObj = {};
    for (key in obj) {
        newObj[key] = obj[key];
    }
    return newObj;
}

function cloneDeep(obj) {
    return JSON.parse(JSON.stringify(obj));
}