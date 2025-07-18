class Queue {
    constructor(){
        this.links = []
        this.set = new Set()
    }
    
    enqueue(value){
        if (!this.set.has(value)){
            this.links.push(value);
            this.set.add(value)
        }
    }

    dequeue(){
        const value = this.links.shift();
        if (value !== undefined){
            this.set.delete(value)
        }
        return value
    }

    peek(){
        return this.links.length > 0 ? this.links[0] : null;
    }

    isEmpty(){
        return this.links.length == 0;
    }
}

module.exports = Queue ;