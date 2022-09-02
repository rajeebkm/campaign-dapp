import React from 'react';

//functional component gets called with props
export default props => {
    return (
        <div>
            <h1>I am a Header</h1>
            {props.children}
            <h1>I am a Footer</h1>
        </div>
    );

};