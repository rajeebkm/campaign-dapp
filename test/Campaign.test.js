const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const compiledFactory = require('../ethereum/build/CampaignFactory.json');
const compiledCampaign = require('../ethereum/build/Campaign.json');

let accounts;
let factory;
let campaignAddress;
let campaign;

beforeEach(async () => {
    accounts = await web3.eth.getAccounts();

    factory = await new web3.eth.Contract(JSON.parse(compiledFactory.interface)).deploy({ data: compiledFactory.bytecode }).send({ from: accounts[0], gas: '1000000'});

    await factory.methods.createCampaign('100').send({
        from: accounts[0],
        gas: 1000000
    });

    // const addresses = await factory.methods.getDeployedCampaigns().call();
    // campaignAddress = addresses[0];
    //or,

    [campaignAddress] = await factory.methods.getDeployedCampaigns().call();

    campaign = await new web3.eth.Contract(
        JSON.parse(compiledCampaign.interface),
        campaignAddress
    );

});


describe('Campaigns', () => {
    it('deploys a factory and a campaign', () => {
        assert.ok(factory.options.address);
        assert.ok(campaign.options.address);
    });

    it('marks caller as the campaign manager', async () => {
        const manager = await campaign.methods.manager().call();
        assert.equal(manager, accounts[0]);
    });

    it('allows people to contribute money and marks them as approver', async () => {
        await campaign.methods.contribute().send({
            from: accounts[1],
            value: '200',
        });
        const isContributor = await campaign.methods.approvers(accounts[1]).call();
        assert.equal(isContributor, true);
        //or, 
        assert(isContributor);
        const approversCount = await campaign.methods.approversCount().call();
        assert.equal(approversCount, 1);
    });

    it('requires a minimum contribution', async () => {
        try {
            await campaign.methods.contribute().send({
                from: accounts[1],
                value: '5'
            });
            assert(false);  
        } catch (error) {
            assert(error);   
        }
    });

    it('allows a manager to make a payment request', async () => {
        await campaign.methods.createRequest('Buy Batteries', '100', accounts[1]).send({
            from: accounts[0],
            gas: '1000000'
        });
        const request = await campaign.methods.requests(0).call();
        assert.equal(request.description, 'Buy Batteries');
    });

    it('processes requests', async () => {
        await campaign.methods.contribute().send({
            from: accounts[0],
            value: web3.utils.toWei('10', 'ether')
        });

        await campaign.methods.createRequest('Buy Batteries', web3.utils.toWei('5', 'ether'), accounts[1]).send({
            from: accounts[0],
            gas: '1000000'
        });

        await campaign.methods.approveRequest(0).send({
            from: accounts[0],
            gas: '1000000'
            
        });
        
        await campaign.methods.finalizeRequest(0).send({
            from: accounts[0],
            gas: '1000000'
        });

        let balance = await web3.eth.getBalance(accounts[1]); //balance in Wei represented as a string
        balance = web3.utils.fromWei(balance, 'ether'); //conversion from wei to ether represented in string
        balance = parseFloat(balance); //parseFloat takes a string and tries to turn it into a decimal number
        //to know the balance of accounts[1]
        // console.log(balance);
        assert(balance > 104 );
    });

});

