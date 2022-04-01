export class Comment {
    constructor(data) {
        if (data) {

            this.comment = data.comment.toLowerCase().trim();
            this.rating = data.rating;
            this.email = data.email;
            this.pid = data.pid;
            this.timestamp = data.timestamp;
        }
    }

    clone() {
        const copyData = this.serialize();
        const c = new Comment(copyData);
        c.set_docId(this.docId);
        return c;
    }

    set_docId(id) {
        this.docId = id;
    }

    // toFirestore data format, etc
    serialize() {
        return {
            comment: this.comment,
            rating: this.rating,
            email: this.email,
            pid: this.pid,
            timestamp: this.timestamp
        }
    }

}